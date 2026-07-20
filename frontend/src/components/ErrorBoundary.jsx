import React from 'react';
import ErrorPage from '../pages/ErrorPage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Cập nhật state để hiển thị fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
 
  render() {
    if (this.state.hasError) {
      return <ErrorPage title="500" message="Đã xảy ra lỗi hệ thống" />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;