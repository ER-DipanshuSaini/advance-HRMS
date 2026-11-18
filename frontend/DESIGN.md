# HireFlow frontend standards

Preserve the established screen layout, navigation groups, table states and
control spacing when refactoring. Apply a visual redesign only when requested.

- Use one clear page heading, descriptive labels, and action verbs such as “New job” or “Save”. Show metrics and service status only when a data source supports them.
- Use the color, spacing, type and radius tokens in `src/index.css` and `src/styles/design-system.css`. Reuse Button, Input, Modal and PageState for interactions and feedback. Keep workflow-specific styles with their feature.
- Label form controls and icon-only buttons. Use links for navigation and buttons for actions. Dialogs should support Escape and restore focus when closed.
- Keep pages usable on a narrow viewport. Let toolbars and forms wrap, and give wide data tables a labelled scroll region. Honor reduced-motion preferences.
- Present loading, empty, and error states separately. Preserve useful context during in-place updates and provide a retry when a read fails.
- Use the shared session utilities and API client. Treat route visibility as presentation and enforce authorization on the backend.
