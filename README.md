# Cover Letter Agent

An AI-powered tool for generating high-quality, truth-based cover letters with significant human-in-the-loop control.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-narrata.co-blue?style=for-the-badge&logo=react)](http://narrata.co/)

![OG Image](http://narrata.co/OG-image.png)

## 🎯 Project Overview

Cover Letter Agent helps users create personalized, job-winning cover letters from their real experience. It uses human-controlled AI that never invents achievements you don't have, ensuring truth-based content generation.

## ✨ Key Features

- **Truth-Based Content**: Generate cover letters from real work experience
- **Human Control**: Full oversight and editing capabilities
- **Template System**: Customizable cover letter templates
- **Work History Management**: Organize and manage professional experience
- **Blurb Library**: Store and reuse proven content snippets
- **Smart Matching**: AI-powered content suggestions based on job requirements
- **Professional UI**: Clean, intuitive interface built with modern design principles

## 🚀 Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Local Development

```sh
# Clone the repository
git clone https://github.com/ycb/cover-letter-agent-front-end-prototype.git

# Navigate to the project directory
cd cover-letter-agent-front-end-prototype

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000` (or the next available port).

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 🏗️ Architecture

### Frontend Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Dialog, Button, Input, Textarea, Label, Badge, Card, Separator, Tabs, DropdownMenu, Accordion, Switch)
- **State Management**: React Context API, useState, useEffect
- **Routing**: React Router DOM
- **Data Fetching**: React Query

### Project Structure

```
src/
├── components/          # UI components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components (Header, etc.)
│   ├── work-history/   # Work history management
│   ├── blurbs/         # Content snippet management
│   └── template-blurbs/ # Template and blurb components
├── pages/              # Main application pages
├── types/              # TypeScript type definitions
├── lib/                # Utility functions and configurations
└── hooks/              # Custom React hooks
```

## 🎨 Design System

### Button Variants

- **Primary**: Filled blue buttons for main actions
- **Secondary**: Blue outline buttons for secondary actions  
- **Tertiary**: Text buttons with underlines for subtle actions

### Spacing & Layout

- Consistent `gap-4` spacing between card header elements
- Floating insert buttons with perfect vertical centering
- Clean, minimal design with proper visual hierarchy

## 🔧 Development

### Code Style

- TypeScript for type safety
- Functional components with hooks
- Consistent naming conventions
- Modular component architecture

### Adding New Features

1. Create components in appropriate directories
2. Follow existing patterns for state management
3. Use the established design system
4. Add proper TypeScript types
5. Test thoroughly before committing

## 📱 Features in Detail

### Work History Management

- **Companies & Roles**: Organize professional experience hierarchically
- **Content Association**: Link blurbs and external links to specific roles
- **Data Sources**: Connect LinkedIn and resume data

### Template System

- **Section Management**: Add, edit, and reorder template sections
- **Static vs Dynamic**: Choose between fixed content or AI-generated matching
- **Floating Insert Buttons**: Precise control over section placement

### Blurb Library

- **Content Organization**: Categorize by type (intro, body, closer, signature)
- **Smart Filtering**: Search and filter by tags, usage, and content
- **Reusability**: Store proven content for future use

## 🚀 Deployment

### Lovable Deployment

Simply open [Lovable](https://lovable.dev/projects/d67b709e-c9dc-46a5-8bcb-22b432618776) and click on Share -> Publish.

### Custom Domain

To connect a custom domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the established patterns
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🔗 Links

- **Live Site**: [http://narrata.co/](http://narrata.co/)
- **Project URL**: https://lovable.dev/projects/d67b709e-c9dc-46a5-8bcb-22b432618776
- **Repository**: https://github.com/ycb/cover-letter-agent-front-end-prototype.git

---

Built with ❤️ using [Lovable](https://lovable.dev) - The AI-powered development platform.
