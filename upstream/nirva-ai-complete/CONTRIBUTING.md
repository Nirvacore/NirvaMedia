# Contributing to NMD Platform

Thank you for your interest in contributing to NMD Platform! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project is committed to providing a welcoming and inspiring community for all. Please read and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to Contribute

### 1. Report Bugs

If you find a bug, please create an issue with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots/logs if relevant

**Example:**
```
Bug: Content publish endpoint returns 500 on special characters in title

Steps to reproduce:
1. Create content with title containing "test & special © chars"
2. Click publish button
3. See 500 error

Expected: Content publishes successfully
Actual: Returns HTTP 500 with error message
```

### 2. Suggest Features

Feature requests are welcome! Please include:
- Use case and motivation
- Detailed description of the feature
- Possible implementation approach
- Potential alternatives

**Example:**
```
Feature: Scheduled content publishing

Motivation: Users want to schedule content publication for optimal engagement

Description: Allow users to select a future date/time for automatic publishing

Implementation: Add scheduled_publish_at field to content model, create cron job for publishing
```

### 3. Write Code

### 4. Improve Documentation

### 5. Review Pull Requests

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/nirva-ai.git`
3. Create feature branch: `git checkout -b feature/your-feature`
4. Follow the [Development Guide](DEVELOPMENT.md)

## Coding Standards

### TypeScript
- Use strict mode: `"strict": true`
- No `any` types without justification
- Meaningful variable names
- Prefer interfaces over types
- Use enums for constants

**Good:**
```typescript
interface ContentInput {
  title: string;
  body: string;
  status: 'draft' | 'published';
}

async function createContent(input: ContentInput): Promise<Content> {
  // ...
}
```

**Bad:**
```typescript
async function createContent(data: any): Promise<any> {
  // ...
}
```

### Code Style
- 2 spaces indentation
- Semicolons required
- Single quotes for strings
- Max line length: 100 characters
- One class/interface per file

**Good:**
```typescript
const message = 'Hello World';
const data = {
  name: 'John',
  email: 'john@example.com',
};
```

**Bad:**
```typescript
const message = "Hello World"
const data = {name: 'John', email: 'john@example.com'}
```

### Comments
- Only for "why", not "what"
- Avoid obvious comments
- Keep comments up-to-date

**Good:**
```typescript
// Cache for 5 minutes as most content doesn't change frequently
const TTL = 5 * 60 * 1000;
```

**Bad:**
```typescript
// Set TTL to 5 minutes
const TTL = 5 * 60 * 1000;
```

### Error Handling
- Always handle errors
- Use meaningful error messages
- Include context in errors
- Log errors appropriately

**Good:**
```typescript
try {
  await saveContent(data);
} catch (error) {
  logger.error('Failed to save content', { contentId: data.id, error });
  throw new ContentError(`Cannot save content: ${error.message}`);
}
```

## Git Workflow

### 1. Create Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `perf/` - Performance improvements
- `test/` - Test additions

### 2. Make Changes

Keep commits focused and atomic:
```bash
git add specific-files
git commit -m "Clear commit message"
```

### 3. Keep Up-to-Date

```bash
git fetch origin
git rebase origin/main
```

### 4. Push Changes

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

Push to GitHub and create PR with:
- Clear title (what did you change)
- Description (why did you change it)
- Checklist of verification steps
- Screenshots/logs for visual changes

**PR Template:**
```markdown
## Description
Brief description of changes

## Type
- [ ] Bug fix
- [ ] New feature
- [ ] Enhancement
- [ ] Documentation

## Changes
- First change
- Second change

## Testing
- [ ] Added tests
- [ ] Updated tests
- [ ] Manual testing done

## Verification
- [ ] Code follows style guidelines
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Documentation updated

## Related Issues
Closes #123
```

## Commit Messages

Follow conventional commits:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation change
- `style`: Code style change
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test changes
- `chore`: Build, dependency updates

**Examples:**

```
feat(content): add content versioning

Allow users to track content versions and restore previous versions.
Includes automatic backup on each publish.

Closes #456
```

```
fix(search): fix memory leak in facet aggregation

Memory was not being released after facet queries due to missing
cleanup in the facet aggregation function.

Fixes #789
```

## Testing

### Test Requirements

- All new features must have tests
- All bug fixes must include regression tests
- Maintain or improve code coverage
- Run full test suite before submitting PR

### Running Tests

```bash
# Run all tests
make test

# Run specific test file
npm test -- file.test.ts

# Run with coverage
make test-coverage

# Watch mode for development
npm test -- --watch
```

### Test Structure

```typescript
describe('Feature Name', () => {
  let mockData;

  beforeEach(() => {
    mockData = createMockData();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Happy path', () => {
    it('should do something', async () => {
      const result = await featureFunction(mockData);
      expect(result).toEqual(expected);
    });
  });

  describe('Error cases', () => {
    it('should handle errors gracefully', async () => {
      expect(() => {
        featureFunction(invalidData);
      }).toThrow(ExpectedError);
    });
  });
});
```

## Code Review Process

### Automated Checks

- ✅ Tests pass
- ✅ Code style passes linter
- ✅ Types check out
- ✅ No security issues
- ✅ Performance benchmarks pass

### Manual Review

Reviewers will check:
- Correctness and logic
- Edge cases handling
- Security implications
- Performance impact
- Documentation accuracy
- Test coverage

### Response to Feedback

- Respond to all comments
- Make requested changes
- Push updates to same branch
- Request re-review when ready

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Include parameter types and return types
- Provide usage examples

**Example:**
```typescript
/**
 * Create new content
 * @param input - Content creation parameters
 * @param input.title - Content title (required)
 * @param input.body - Content body (required)
 * @returns Created content object
 * @throws ContentError if creation fails
 *
 * @example
 * const content = await createContent({
 *   title: 'My Post',
 *   body: 'Content here'
 * });
 */
async function createContent(input: ContentInput): Promise<Content> {
  // ...
}
```

### Markdown Documentation

- Clear headings hierarchy
- Code examples with syntax highlighting
- Links to related docs
- Keep updated with code changes

## Performance Considerations

- Optimize database queries
- Use indexes appropriately
- Implement caching where beneficial
- Monitor memory usage
- Benchmark changes

## Security Guidelines

- Never commit secrets
- Validate all inputs
- Sanitize outputs
- Use parameterized queries
- Follow OWASP guidelines
- Report security issues privately

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create pull request
4. After merge, create tag: `git tag v1.2.3`
5. Push tag: `git push origin v1.2.3`
6. GitHub Actions handles deployment

## Questions?

- Check existing issues and discussions
- Ask in GitHub Discussions
- Email: dev@nmd.platform
- Join our Discord community

## Recognition

Contributors are recognized in:
- Release notes
- README contributors section
- Annual appreciation post

Thank you for contributing! 🚀
