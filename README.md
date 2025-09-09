# 🚀 Cover Letter Agent: AI That Gets PMs In The Door

Tired of generic, robotic cover letters? Cover Letter Agent helps Product Managers land more interviews via intelligent feedback, re-usable content and objective level assessment. ✨

[![Live Demo](https://img.shields.io/badge/Live%20Demo-narrata.co-blue?style=for-the-badge&logo=react)](http://narrata.co/)

![Narrata OG Image](http://narrata.co/OG-image.png)

- **Generate cover letters from your real work experience**
- **Full control—edit, organize, and reuse content with ease.**
- **Instant draft suggestions tailored to *each* job—never start from scratch.**
- **Intelligent feedback and objective assessment so you get hired faster.**

Try the live app [narrata.co](http://narrata.co/) or run locally!

---

## How It Works

1. **Add your job history and proven stories.**
2. **Choose or customize a template.**
3. **Paste any job posting to get a tailored draft instantly.**
4. **Edit, personalize, send—land more interviews!**

## Why Cover Letter Agent?

We believe every candidate deserves a great career story—told strategically, easily, and with the help of AI that gets results. Built by PMs, for PMs.

---

## 🛠️ Getting Started Locally

### Prerequisites

- Node.js (via [nvm](https://github.com/nvm-sh/nvm))
- npm

### Clone & Run

```bash
git clone https://github.com/ycb/cover-letter-agent-front-end-prototype.git
cd cover-letter-agent-front-end-prototype
npm install
npm run dev
```

The application will be available at `http://localhost:8080`.

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

---

## ✨ Key Features

- **Experience-Based Content**: Generate cover letters from real work experience
- **Human Control**: Full oversight and editing capabilities
- **Template System**: Customizable cover letter templates
- **Work History Management**: Organize and manage professional experience
- **Story Library**: Store and reuse proven content snippets
- **Smart Matching**: AI-powered content suggestions based on job requirements
- **Professional UI**: Clean, intuitive interface built with modern design principles

---

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
│   ├── stories/        # Re-usable content management
│   └── template-content/ # Template and re-usable content components
├── pages/              # Main application pages
├── types/              # TypeScript type definitions
├── lib/                # Utility functions and configurations
└── hooks/              # Custom React hooks
```

---

## 🎨 Design System

### Button Variants

- **Primary**: Filled blue buttons for main actions
- **Secondary**: Blue outline buttons for secondary actions  
- **Tertiary**: Text buttons with underlines for subtle actions

### Spacing & Layout

- Consistent `gap-4` spacing between card header elements
- Floating insert buttons with perfect vertical centering
- Clean, minimal design with proper visual hierarchy

---

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

---

## 📱 Features in Detail

### Work History Management

- **Companies & Roles**: Organize professional experience hierarchically
- **Content Association**: Link stories and external links to specific roles
- **Data Sources**: Connect LinkedIn and resume data

### Template System

- **Section Management**: Add, edit, and reorder template sections
- **Static vs Dynamic**: Choose between fixed content or AI-generated matching
- **Floating Insert Buttons**: Precise control over section placement

### Story Library

- **Content Organization**: Categorize by type (intro, body, closer, signature)
- **Smart Filtering**: Search and filter by tags, usage, and content
- **Reusability**: Store proven content for future use

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the established patterns
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🔗 Links

- **Live Site**: [http://narrata.co/](http://narrata.co/)
- **Repository**: https://github.com/ycb/cover-letter-agent-front-end-prototype.git

