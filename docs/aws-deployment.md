# AWS Deployment Guide

Deploying the complete scanner stack (Jenkins + Trivy + Prometheus + Pushgateway + Grafana) on a single AWS EC2 instance. This removes the two localhost limitations documented in [ci-cd.md](ci-cd.md):

| Localhost limitation | AWS solution |
|---|---|
| GitHub webhooks can't reach localhost → needed ngrok tunnel (URL changes on restart) | EC2 has a **stable public IP** — webhook points directly at Jenkins |
| GitHub Actions can't push metrics to localhost Pushgateway | Actions can now reach `http://<EC2-IP>:9091` — cloud CI feeds the dashboard too |

```
GitHub push ──webhook──▶ EC2 (Ubuntu, t3.micro)
                          ├── Jenkins  :8080   ← no ngrok needed
                          ├── Trivy + Docker
                          └── docker compose:
                              ├── Prometheus  :9090
                              ├── Pushgateway :9091
                              └── Grafana     :3000  ← dashboard accessible from anywhere
```

---

## Step 1: Launch the EC2 Instance

1. AWS Console → **EC2 → Launch Instance**
2. Name: `vuln-scanner`
3. AMI: **Ubuntu Server 24.04 LTS** (64-bit x86)
4. Instance type: **t3.micro** (Free Tier eligible; see RAM note in Step 4)
5. Key pair: **Create new key pair** → name `vuln-scanner-key` → download the `.pem` file (you can't download it again later)
6. Storage: **25 GB gp3** (default 8 GB is too small — Trivy's CVE DB is ~500 MB and Docker images add up fast)
7. **Launch instance**

## Step 2: Security Group (AWS Firewall)

EC2 → your instance → **Security** tab → security group → **Edit inbound rules**:

| Port | Purpose | Source | Notes |
|---|---|---|---|
| 22 | SSH | **My IP** | Never 0.0.0.0/0 |
| 8080 | Jenkins UI + webhook | 0.0.0.0/0 * | Needed so GitHub can deliver webhooks |
| 3000 | Grafana dashboard | My IP (or 0.0.0.0/0 temporarily for a demo) | Grafana has its own login |
| 9090 | Prometheus | **My IP only** ⚠️ | No auth built in — never expose publicly |
| 9091 | Pushgateway | **My IP only** ⚠️ (+ see GitHub Actions note below) | Anyone who can reach it can push fake metrics |

> \* Jenkins port open to the world is protected by the Jenkins login, but for extra safety you can restrict 8080 to [GitHub's webhook IP ranges](https://api.github.com/meta) + your IP.

## Step 3: Install Everything (SSH in)

```bash
chmod 400 vuln-scanner-key.pem
ssh -i vuln-scanner-key.pem ubuntu@<EC2-PUBLIC-IP>
```

The install commands are the same Linux commands from [setup.md](setup.md):

```bash
# Docker + Compose + basics
sudo apt update
sudo apt install -y docker.io docker-compose-v2 python3-pip git
sudo usermod -aG docker ubuntu
newgrp docker

# Trivy
sudo apt install -y wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt update && sudo apt install -y trivy

# Jenkins (Linux native)
sudo apt install -y openjdk-17-jre
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update && sudo apt install -y jenkins
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins

# The project — same one-command setup as localhost 🎉
git clone https://github.com/Avinashsain/container-vuln-scanner.git
cd container-vuln-scanner
chmod +x setup.sh scripts/*.sh
./setup.sh
```

## Step 4: Add Swap (t3.micro has only 1 GB RAM)

Jenkins + Grafana + Prometheus + a Trivy scan running together will exhaust 1 GB. Swap prevents out-of-memory crashes:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# persist across reboots:
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Alternative: use **t3.small** (2 GB RAM, not free tier) only on demo days — roughly $0.02/hour, stopped otherwise.

## Step 5: Configure Jenkins

1. Open `http://<EC2-IP>:8080`
2. Initial password: `sudo cat /var/lib/jenkins/secrets/initialAdminPassword`
3. Install suggested plugins → create admin user
4. Create the pipeline job exactly as documented in [ci-cd.md](ci-cd.md) (Pipeline script from SCM → `ci/Jenkinsfile` → branch `*/main`)

**One Jenkinsfile adjustment:** the macOS PATH line is unnecessary on Linux (standard paths already work). Either remove it or make it Linux-safe:

```groovy
environment {
    PATH          = "/usr/local/bin:${env.PATH}"   // Linux-safe (was /opt/homebrew for macOS)
    IMAGE_NAME    = "myapp:${BUILD_NUMBER}"
    FAIL_SEVERITY = "HIGH,CRITICAL"
}
```

## Step 6: GitHub Webhook (No More ngrok!)

GitHub repo → **Settings → Webhooks → Add webhook**:
- Payload URL: `http://<EC2-IP>:8080/github-webhook/` (trailing slash required)
- Content type: `application/json`
- Events: *Just the push event*

Because the EC2 public IP is stable while the instance runs, this webhook keeps working across ngrok-style restarts — the main operational pain of the localhost setup is gone.

> **IP caveat:** a stop/start of the instance assigns a **new** public IP → update the webhook. Options: (a) just update the URL each time, (b) allocate an **Elastic IP** (permanent) — free while attached to a *running* instance, but charged while the instance is stopped, so release it when not needed.

## Step 7: GitHub Actions → EC2 Pushgateway (Optional Upgrade)

Now that Pushgateway is reachable, cloud CI can feed the dashboard. Add to `.github/workflows/scan.yml` after the JSON report step:

```yaml
      - name: Push metrics to Grafana stack on EC2
        if: always()
        run: |
          pip install --quiet requests || true
          python3 scripts/push_metrics.py scan-report.json
        env:
          PUSHGATEWAY: http://<EC2-IP>:9091
```

And make the URL configurable in `scripts/push_metrics.py` (one-line change):

```python
import os
PUSHGATEWAY = os.environ.get("PUSHGATEWAY", "http://localhost:9091")
```

Security note: for this to work the security group must allow 9091 from GitHub Actions runners (wide IP range). Acceptable for a college project demo; in production you'd put Pushgateway behind auth or a VPN instead of opening it.

## Step 8: Access Your Cloud Dashboard

- **Grafana:** `http://<EC2-IP>:3000` (admin / admin123 — change this since it's now internet-facing: Grafana → profile → Change password)
- **Jenkins:** `http://<EC2-IP>:8080`
- Re-create the dashboard in 2 minutes by importing `dashboards/vuln-dashboard.json` (Grafana → Dashboards → New → Import)

---

## Cost Control (maps to the project's Cost Optimization criteria)

| Practice | Effect |
|---|---|
| **Stop the instance when not in use** | Compute billing stops; only ~25 GB disk (~$2/month, free tier covers it) |
| t3.micro on Free Tier | 750 hrs/month free for 12 months = effectively $0 |
| AWS **Budget alert** at $1 (Billing → Budgets) | Email warning before any surprise |
| Release Elastic IP when instance is stopped | Avoids the idle-EIP hourly charge |
| Swap file instead of a bigger instance | Free RAM relief vs paying for t3.small |
| Trivy DB cached on the EBS volume | Survives reboots — no 500 MB re-download |
| Single instance for everything | No load balancer, no RDS, no extra services |

**Estimated cost: $0/month** within Free Tier limits with the instance stopped outside working sessions.

---

## Localhost vs AWS Comparison

| Aspect | Localhost (dev) | AWS EC2 (deployed) |
|---|---|---|
| Webhook | ngrok tunnel, URL changes on restart | Direct to stable public IP |
| Grafana access | Only on your machine | Any device, anywhere |
| GitHub Actions → Pushgateway | ❌ unreachable | ✅ reachable |
| Cost | $0 | $0 (Free Tier, stopped when idle) |
| Uptime | Only while laptop is on | While instance runs |
| Code changes needed | — | 1 line (Jenkinsfile PATH) + optional Pushgateway env var |

**The key takeaway:** the entire stack moved from laptop to cloud with essentially zero code changes — because everything was built on Docker, portable scripts, and configuration files. That portability was a design goal from Sprint 1.
