# Contributing to IronHaven AIMMO

Thank you for your interest in contributing to IronHaven AIMMO! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Modern browser with WebGL 2.0 support

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/IronHaven_AIMMO.git`
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`
5. Open http://localhost:5173 in your browser

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Use functional components over class components
- Maintain consistent indentation (2 spaces)
- Use meaningful variable and function names

### Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add vehicle physics system
fix: resolve collision detection bug
docs: update API documentation
```

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

## 🎮 Game Development Areas

### High Priority
- **Multiplayer Networking**: WebRTC or WebSocket implementation
- **Performance Optimization**: LOD systems, culling, texture streaming
- **Mobile Support**: Touch controls and responsive design
- **Audio System**: 3D spatial audio and dynamic music

### Medium Priority
- **Character Progression**: Leveling, skills, and customization
- **Quest System**: Dynamic mission generation
- **Inventory Management**: Item system and crafting
- **Social Features**: Chat, guilds, and friends

### Low Priority
- **VR/AR Support**: Immersive experiences
- **Modding Support**: Plugin architecture
- **Analytics**: Player behavior tracking
- **Localization**: Multi-language support

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to recreate the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, OS, device specifications
6. **Screenshots/Videos**: Visual evidence if applicable
7. **Console Logs**: Any error messages or warnings

### Bug Report Template
```markdown
**Bug Description**
A clear and concise description of the bug.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- Browser: [e.g. Chrome 91, Firefox 89]
- OS: [e.g. Windows 10, macOS 11.4, Ubuntu 20.04]
- Device: [e.g. Desktop, Mobile, Tablet]
- Graphics Card: [e.g. NVIDIA GTX 1060, AMD RX 580]

**Additional Context**
Add any other context about the problem here.
```

## 💡 Feature Requests

For feature requests, please:

1. Check existing issues to avoid duplicates
2. Provide clear use cases and benefits
3. Consider implementation complexity
4. Include mockups or examples if helpful

### Feature Request Template
```markdown
**Feature Description**
A clear and concise description of the feature.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
Describe your proposed solution.

**Alternatives Considered**
Describe alternative solutions you've considered.

**Additional Context**
Add any other context, screenshots, or examples.
```

## 🔧 Pull Request Process

1. **Create an Issue**: Discuss the change before implementing
2. **Fork & Branch**: Create a feature branch from `main`
3. **Implement**: Write code following our guidelines
4. **Test**: Ensure your changes work correctly
5. **Document**: Update documentation if needed
6. **Submit PR**: Create a pull request with clear description

### Pull Request Template
```markdown
**Description**
Brief description of changes made.

**Related Issue**
Fixes #(issue number)

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing**
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] All tests pass

**Screenshots**
If applicable, add screenshots of the changes.

**Checklist**
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## 🧪 Testing

### Manual Testing
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Verify mobile responsiveness
- Check performance with dev tools
- Test with different graphics settings

### Automated Testing
- Unit tests for utility functions
- Integration tests for game systems
- Performance benchmarks
- Visual regression tests

## 📚 Documentation

### Code Documentation
- Use JSDoc comments for functions and classes
- Document complex algorithms and game mechanics
- Include usage examples for APIs
- Keep README.md updated

### Game Documentation
- Update feature descriptions
- Document controls and gameplay mechanics
- Maintain troubleshooting guides
- Create developer tutorials

## 🎨 Asset Guidelines

### 3D Models
- Use efficient polygon counts
- Include proper UV mapping
- Optimize textures for web delivery
- Follow naming conventions

### Textures
- Use power-of-2 dimensions when possible
- Compress appropriately (JPEG for photos, PNG for graphics)
- Include normal maps and PBR materials
- Maximum 2K resolution for most assets

### Audio
- Use compressed formats (OGG, MP3)
- Normalize audio levels
- Include spatial audio metadata
- Keep file sizes reasonable

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- In-game credits
- Release notes
- Community highlights

## 📞 Getting Help

- **Discord**: Join our development community
- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Email**: Contact maintainers directly

## 📜 Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

---

Thank you for contributing to IronHaven AIMMO! Together, we're building the future of browser-based gaming. 🎮✨

