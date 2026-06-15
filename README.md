# SIGMAPANEL - SMS OTP Management Platform

Modern, responsive, production-ready admin dashboard for SMS and OTP management with comprehensive tracking, live feeds, and advanced workflows.

## 🚀 Features

### Core Functionality
- **Real-Time OTP Feed** - Live SMS monitoring with secure OTP masking (XXX-XXX format)
- **Number Management** - Complete lifecycle for test and production numbers
- **Range Management** - Organize numbers by ranges with termination support
- **Multi-Format Export** - CSV, Excel, PDF, TXT exports with filtering
- **API Playground** - Interactive 6-step API testing interface
- **Payout Tracking** - Comprehensive earnings tracking per number/range with filters
- **Support System** - Built-in ticketing and news/announcements

### User Experience
- **My Profile** - Complete profile management with avatar upload & password change
- **Self Allocation** - Request numbers with weekly/monthly payment terms
- **Bulk Allocation** - Multi-range allocation workflow for admins
- **Live Updates** - Real-time data with smooth animations
- **Responsive Design** - Full mobile, tablet, and desktop support
- **Premium Animations** - Smooth transitions and visual feedback

### Security & Authentication
- **Role-Based Access** - Admin, Manager, Reseller, Sub-Reseller, Test User roles
- **Secure Authentication** - JWT tokens with captcha verification
- **OTP Masking** - Sensitive data protection in live views
- **Password Management** - Secure password change functionality
- **API Token Management** - Rotate and manage API access tokens

## 📦 Technology Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **SQLite** - Lightweight embedded database
- **SMPP Server** - SMS protocol implementation
- **WebSocket** - Real-time updates

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **Modern CSS** - Custom animations and responsive design
- **SPA Architecture** - Single-page application with routing
- **Progressive Enhancement** - Works on all devices

## 🛠️ Installation

### Prerequisites
- Python 3.8+
- pip
- Git

### Quick Start

```bash
# Clone repository
git clone https://github.com/Adnan5740/sigmapanel-ci.git
cd sigmapanel-ci

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -c "from database import init_db; init_db()"

# Run application
python main.py
```

Access at: `http://localhost:8000`

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

### Default Credentials

```
Admin:
  Username: admin
  Password: admin123

Test User:
  Username: test123
  Password: test123
```

⚠️ **Change default passwords immediately in production**

## 📁 Project Structure

```
sigmapanel-ci/
├── static/
│   ├── css/
│   │   └── style.css          # Complete UI styling with animations
│   ├── js/
│   │   ├── api.js             # API client
│   │   ├── ui.js              # UI utilities and icons
│   │   ├── router.js          # SPA routing
│   │   ├── auth.js            # Authentication
│   │   ├── dashboard.js       # Dashboard
│   │   ├── sms.js             # SMS & OTP management
│   │   ├── numbers.js         # Number management
│   │   ├── ranges.js          # Range management
│   │   ├── users.js           # User management
│   │   ├── payouts.js         # Payout tracking
│   │   ├── notifications.js   # News & Support
│   │   ├── profile.js         # My Profile
│   │   ├── api_management.js  # API Playground
│   │   ├── settings.js        # Settings
│   │   ├── payments.js        # Payment management
│   │   ├── smpp.js            # SMPP server
│   │   └── app.js             # Main application
│   └── index.html             # Entry point
├── routes/
│   ├── auth.py               # Authentication routes
│   ├── dashboard.py          # Dashboard API
│   ├── sms.py                # SMS routes
│   ├── numbers.py            # Number routes
│   ├── numbers_ext.py        # Extended number operations
│   ├── ranges.py             # Range routes
│   ├── users.py              # User routes
│   ├── payments.py           # Payment routes
│   ├── notifications.py      # Notification routes
│   ├── api_management.py     # API token management
│   └── settings.py           # Settings routes
├── database.py               # Database setup & schema
├── main.py                   # FastAPI application
├── auth.py                   # Authentication logic
├── smpp_server.py           # SMPP server implementation
├── worker.py                # Background tasks
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## 🔐 Security Features

- **Captcha Protection** - Math captcha on login
- **Rate Limiting** - Prevent brute force attacks
- **JWT Tokens** - Secure stateless authentication
- **Password Hashing** - Bcrypt password storage
- **Role-Based Access Control** - Granular permissions
- **CORS Protection** - Configured CORS policies
- **Input Validation** - Comprehensive input sanitization
- **OTP Masking** - Hide sensitive codes in UI

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/upload-proof` - Upload registration proof

### SMS Management
- `GET /api/sms` - Get SMS messages with filters
- `GET /api/sms/delivery-logs` - Delivery receipts

### Number Management
- `GET /api/numbers` - Get user numbers
- `POST /api/numbers-ext/allocate` - Self allocate numbers
- `POST /api/numbers-ext/bulk-allocate` - Bulk allocation
- `GET /api/numbers-ext/export` - Export numbers (CSV/Excel/PDF/TXT)

### Range Management
- `GET /api/ranges` - Get ranges
- `POST /api/ranges` - Create range
- `POST /api/ranges/{id}/numbers` - Add numbers to range
- `POST /api/ranges/{id}/test-numbers` - Add test numbers

### User Management
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update profile
- `POST /api/users/me/password` - Change password
- `POST /api/users/me/avatar` - Upload avatar

### API Management
- `GET /api/api-management/my-token` - Get API token
- `POST /api/api-management/regenerate-token` - Rotate token

## 🎨 UI Features

### Animations
- Card entrance animations
- Input focus effects
- Button hover states
- Sequential reveals
- Loading spinners
- Pulse indicators

### Components
- Responsive tables
- Modal dialogs
- Toast notifications
- Badge indicators
- Search filters
- Date pickers
- File uploads
- Progress bars

### Themes
- Modern color palette
- Consistent spacing
- Clear typography
- Icon system
- Shadow depth
- Border radius

## 🔄 Workflows

### Self Allocation
1. View available ranges
2. Select payment term (weekly/monthly)
3. Choose quantity within limit
4. Submit allocation request

### Bulk Allocation (Admin)
1. Select multiple ranges
2. Choose target user
3. Set quantity per range
4. Execute batch allocation

### Range Creation
1. Enter range details
2. Upload test numbers (optional)
3. Upload assignable numbers (optional)
4. Create range

### Support Tickets
1. Create ticket with subject/message
2. Admin views and replies
3. Ticket closed with resolution

## 📱 Responsive Breakpoints

- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

## 🧪 Testing

```bash
# Run backend tests
python -m pytest tests/

# Check code quality
python -m flake8 .

# Type checking
python -m mypy .
```

## 🚀 Deployment

### Production Checklist
- [ ] Change default passwords
- [ ] Configure environment variables
- [ ] Set up HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring
- [ ] Configure log rotation
- [ ] Review CORS settings

### Environment Variables

```bash
DATABASE_URL=sqlite:///data/sigmapanel.db
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=https://yourdomain.com
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-password
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /static {
        alias /path/to/sigmapanel-ci/static;
        expires 1y;
    }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

- **Documentation:** See inline code comments
- **Issues:** GitHub Issues
- **Email:** support@sigmapanel.com

## 🔄 Changelog

### Version 2.0 (2026-06-15)
- ✅ Complete UI overhaul with modern animations
- ✅ My Profile page with avatar upload
- ✅ Multi-format export (CSV, Excel, PDF, TXT)
- ✅ Enhanced API Playground with 6-step interface
- ✅ Payout tracking system with filters
- ✅ News and support ticket system
- ✅ Improved allocation workflows
- ✅ OTP masking in live feeds
- ✅ Mobile responsive design
- ✅ Button alignment fixes
- ✅ Sidebar scrolling improvements

### Version 1.0 (Initial Release)
- Basic SMS management
- Number allocation
- User management
- SMPP server integration

## 🎯 Roadmap

- [ ] Two-Factor Authentication (2FA)
- [ ] Advanced analytics dashboard
- [ ] Webhook integration
- [ ] Email notifications
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Mobile app (iOS/Android)
- [ ] Advanced reporting
- [ ] Bulk SMS sending
- [ ] API rate limiting dashboard

---

**Built with ❤️ for SMS professionals**

For more information, visit [GitHub Repository](https://github.com/Adnan5740/sigmapanel-ci)
