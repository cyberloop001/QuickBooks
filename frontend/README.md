# Phone Billing Dashboard Frontend

A modern, responsive React dashboard for managing phone billing automation with QuickBooks Online integration.

## 🚀 Features

- **Modern Dashboard**: Clean, professional interface with real-time data
- **Billing Job Management**: Monitor, run, and manage billing jobs
- **Client Management**: Add, edit, and map clients between phone system and QBO
- **Real-time Monitoring**: Live status updates and job progress tracking
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Kill Switch**: Emergency stop for all billing operations
- **Settings Management**: Configure system parameters and integrations

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Zustand** for state management
- **React Hook Form** for form handling
- **Recharts** for data visualization
- **Lucide React** for icons
- **React Hot Toast** for notifications

## 📦 Installation

1. **Navigate to frontend directory**:

   ```bash
   cd frontend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── Layout.tsx      # Main layout with sidebar
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── BillingJobs.tsx # Billing job management
│   │   ├── Clients.tsx     # Client management
│   │   ├── Settings.tsx    # System settings
│   │   └── Login.tsx       # Authentication
│   ├── stores/             # State management
│   │   └── authStore.ts    # Authentication state
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## 🎯 Key Components

### Dashboard

- **Overview Cards**: Total clients, invoices, revenue, and failed jobs
- **Quick Actions**: Run billing jobs, schedule jobs, test APIs
- **Revenue Chart**: Monthly revenue visualization
- **Recent Jobs**: Latest billing job status and results

### Billing Jobs

- **Job Management**: View, run, retry, and cancel billing jobs
- **Status Tracking**: Real-time job status updates
- **Manual Triggers**: Run jobs for specific date ranges
- **Dry Run Mode**: Test billing without creating invoices

### Client Management

- **Client Mapping**: Link phone system IDs to QBO customer IDs
- **Contact Information**: Store client details and billing addresses
- **Search & Filter**: Find clients quickly
- **Bulk Operations**: Import/export client data

### Settings

- **Kill Switch**: Emergency stop for all billing operations
- **Billing Configuration**: Rate per minute, timezone settings
- **API Integrations**: Phone system and QBO connection settings
- **Notifications**: Email and Slack alert configuration

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_NAME=Phone Billing Dashboard
```

### API Proxy

The frontend is configured to proxy API requests to the backend:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

## 🚀 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

### Development Workflow

1. **Start backend**: Ensure the Node.js backend is running on port 3001
2. **Start frontend**: Run `npm run dev` in the frontend directory
3. **Make changes**: Edit components in `src/` directory
4. **Hot reload**: Changes automatically refresh in the browser
5. **Build**: Run `npm run build` when ready for production

## 🎨 Styling

### Tailwind CSS

The project uses Tailwind CSS with custom component classes:

```css
/* Custom component classes */
.btn {
  /* Button base styles */
}
.btn-primary {
  /* Primary button variant */
}
.card {
  /* Card container styles */
}
.input {
  /* Form input styles */
}
.badge {
  /* Status badge styles */
}
```

### Color Scheme

- **Primary**: Blue (#3b82f6) for main actions
- **Success**: Green (#22c55e) for positive states
- **Warning**: Yellow (#f59e0b) for caution states
- **Danger**: Red (#ef4444) for error states

## 📱 Responsive Design

The dashboard is fully responsive with:

- **Mobile-first approach**
- **Collapsible sidebar** on mobile devices
- **Responsive tables** with horizontal scrolling
- **Touch-friendly** buttons and controls
- **Optimized layouts** for all screen sizes

## 🔐 Authentication

### Demo Mode

For development and testing, the app includes a demo authentication system:

- **Any email/password** combination will work
- **No backend authentication** required
- **Session persistence** using localStorage

### Production Authentication

To implement real authentication:

1. **Update authStore.ts** with your auth API endpoints
2. **Add JWT token handling** for API requests
3. **Implement proper session management**
4. **Add role-based access control**

## 📊 Data Visualization

### Charts

The dashboard uses Recharts for data visualization:

- **Line charts** for revenue trends
- **Bar charts** for usage statistics
- **Responsive charts** that adapt to container size
- **Interactive tooltips** and legends

### Real-time Updates

- **Live job status** updates
- **Real-time metrics** refresh
- **WebSocket support** for live data (can be added)

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy Options

1. **Static Hosting**: Netlify, Vercel, GitHub Pages
2. **CDN**: AWS CloudFront, Cloudflare
3. **Container**: Docker with Nginx
4. **Server**: Apache, Nginx

### Environment Configuration

Update environment variables for production:

```env
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_NAME=Phone Billing Dashboard
```

## 🧪 Testing

### Manual Testing

- **Cross-browser testing** (Chrome, Firefox, Safari, Edge)
- **Mobile device testing** (iOS, Android)
- **Responsive design testing** (various screen sizes)

### Automated Testing

To add automated testing:

1. **Install Jest and React Testing Library**
2. **Add test scripts** to package.json
3. **Create test files** for components
4. **Set up CI/CD** pipeline

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts**: Change port in `vite.config.ts`
2. **API connection**: Ensure backend is running on port 3001
3. **Build errors**: Check TypeScript compilation
4. **Styling issues**: Verify Tailwind CSS is properly configured

### Debug Mode

Enable debug logging in the browser console:

```typescript
// Add to main.tsx for development
if (import.meta.env.DEV) {
  console.log("Development mode enabled");
}
```

## 📚 API Integration

### Backend Endpoints

The frontend expects these API endpoints:

- `GET /api/billing/jobs` - List billing jobs
- `POST /api/billing/run` - Run billing job
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/health` - Health check

### Error Handling

- **Toast notifications** for user feedback
- **Loading states** for async operations
- **Error boundaries** for component errors
- **Retry mechanisms** for failed requests

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Make changes** and test thoroughly
4. **Commit changes**: `git commit -am 'Add new feature'`
5. **Push to branch**: `git push origin feature/new-feature`
6. **Create pull request**

## 📄 License

This project is part of the Phone Billing System MVP.

## 🆘 Support

For support and questions:

- **Documentation**: Check this README and backend documentation
- **Issues**: Report bugs and feature requests
- **Development**: Contact the development team

---

**Built with ❤️ using modern web technologies**
