# Note Link - qlam

A modern Next.js web application for checking if links are working or failing. Built with TypeScript, Tailwind CSS, and modern React patterns.

## Features

- **Link Status Checking**: Check individual links or all links at once
- **Real-time Status**: Visual indicators showing working, failed, or checking status
- **Dynamic Table**: Add or remove rows as needed
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Error Handling**: Detailed error messages for failed connections
- **Timeout Protection**: 10-second timeout for link checks

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for link checking
- **Lucide React** - Modern icon library
- **Headless UI** - Accessible UI components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd check-link
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Add Links**: Type URLs in the input fields (e.g., `https://google.com`)
2. **Check Individual**: Click the "Check" button next to any link
3. **Check All**: Click "Check All" to verify all links at once
4. **Add Rows**: Click "Add Row" to add more link inputs
5. **Remove Rows**: Click the trash icon to remove unwanted rows

## Status Indicators

- 🟢 **Working**: Link is accessible (HTTP 200-399)
- 🔴 **Failed**: Link is not accessible (HTTP 400+ or connection error)
- 🔵 **Checking**: Currently verifying the link
- ⚪ **Not Checked**: Link hasn't been verified yet

## API Endpoints

The application uses client-side HTTP requests to check links. No backend API is required.

## Development

### Project Structure

```
src/
├── app/
│   ├── layout.tsx      # Root layout component
│   ├── page.tsx        # Main application page
│   └── globals.css     # Global styles
├── components/         # Reusable components (if any)
└── types/             # TypeScript type definitions (if any)
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

The application can be deployed to any platform that supports Next.js:

- **Vercel** (recommended)
- **Netlify**
- **Railway**
- **AWS Amplify**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support or questions, please open an issue in the repository.
