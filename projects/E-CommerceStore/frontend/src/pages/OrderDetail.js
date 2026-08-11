import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { orderService, handleApiError } from '../services/api';

const OrderDetail = () => {
  const { id } = useParams();

  const { data: order, isLoading, error } = useQuery(
    ['order', id],
    () => orderService.getOrder(id),
    {
      select: (response) => response.data
    }
  );

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      confirmed: '#007bff',
      processing: '#6f42c1',
      shipped: '#fd7e14',
      delivered: '#28a745',
      cancelled: '#dc3545',
      refunded: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      refunded: 'Refunded'
    };
    return texts[status] || status;
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="error">
          {error.response?.status === 404
            ? 'Order not found.'
            : `Error loading order: ${handleApiError(error)}`}
        </div>
        <Link to="/orders" className="btn btn-outline" style={{ marginTop: '1rem' }}>
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <Link to="/orders" style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
        &larr; Back to Orders
      </Link>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '2rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}
      >
        {/* Order Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Order #{order.orderNumber}</h1>
            <p style={{ color: '#6c757d', marginBottom: '0.5rem' }}>
              Placed on {formatDate(order.createdAt)}
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span
                style={{
                  backgroundColor: getStatusColor(order.status),
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}
              >
                {getStatusText(order.status)}
              </span>
              <span
                style={{
                  backgroundColor: getStatusColor(order.paymentStatus),
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}
              >
                {order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
              {formatPrice(order.pricing.total)}
            </div>
            <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div
          style={{
            borderTop: '1px solid #e9ecef',
            borderBottom: '1px solid #e9ecef',
            padding: '1rem 0',
            marginBottom: '1rem'
          }}
        >
          <h4 style={{ marginBottom: '1rem' }}>Items Ordered</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {order.items.map(item => (
              <div
                key={item.productId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {item.productDetails.name}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                    SKU: {item.productDetails.sku} • Qty: {item.quantity}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>{formatPrice(item.total)}</div>
                  <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                    {formatPrice(item.price)} each
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div
          style={{
            borderBottom: '1px solid #e9ecef',
            padding: '1rem 0',
            marginBottom: '1rem'
          }}
        >
          <h4 style={{ marginBottom: '1rem' }}>Order Summary</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Subtotal</span>
              <span>{formatPrice(order.pricing.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Shipping</span>
              <span>{formatPrice(order.pricing.shipping)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Tax</span>
              <span>{formatPrice(order.pricing.tax)}</span>
            </div>
            {order.pricing.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6c757d' }}>Discount</span>
                <span>-{formatPrice(order.pricing.discount)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid #e9ecef'
              }}
            >
              <span>Total</span>
              <span>{formatPrice(order.pricing.total)}</span>
            </div>
          </div>
        </div>

        {/* Shipping & Tracking */}
        <div className="grid grid-2" style={{ gap: '2rem' }}>
          <div>
            <h4 style={{ marginBottom: '1rem' }}>Shipping Address</h4>
            <div style={{ color: '#6c757d' }}>
              <p>
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.zipCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && <p>Phone: {order.shippingAddress.phone}</p>}
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem' }}>Delivery Info</h4>
            <div style={{ color: '#6c757d' }}>
              <p>
                <strong>Method:</strong> {order.shipping.method}
              </p>
              {order.shipping.trackingNumber && (
                <p>
                  <strong>Tracking:</strong> {order.shipping.trackingNumber}
                </p>
              )}
              {order.shipping.carrier && (
                <p>
                  <strong>Carrier:</strong> {order.shipping.carrier}
                </p>
              )}
              {order.shipping.estimatedDelivery && (
                <p>
                  <strong>Estimated Delivery:</strong>{' '}
                  {formatDate(order.shipping.estimatedDelivery)}
                </p>
              )}
              {order.shipping.deliveredAt && (
                <p style={{ color: '#28a745', fontWeight: 'bold' }}>
                  <strong>Delivered:</strong> {formatDate(order.shipping.deliveredAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        {order.customerNotes && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e9ecef' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Notes</h4>
            <p style={{ color: '#6c757d' }}>{order.customerNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
