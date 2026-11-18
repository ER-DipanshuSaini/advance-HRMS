# HireFlow frontend standards

Preserve the established screen layout, navigation groups, table states and
control spacing when refactoring. Apply a visual redesign only when requested.

- Use one clear page heading, descriptive labels, and action verbs such as “New job” or “Save”. Show metrics and service status only when a data source supports them.
- Use the color, spacing, type and radius tokens in `src/index.css` and `src/styles/design-system.css`. Reuse Button, Input, Modal and PageState for interactions and feedback. Keep workflow-specific styles with their feature.
- Label form controls and icon-only buttons. Use links for navigation and buttons for actions. Dialogs should support Escape and restore focus when closed.
- Keep pages usable on a narrow viewport. Let toolbars and forms wrap, and give wide data tables a labelled scroll region. Honor reduced-motion preferences.
- Present loading, empty, and error states separately. Preserve useful context during in-place updates and provide a retry when a read fails.
- Use the shared session utilities and API client. Treat route visibility as presentation and enforce authorization on the backend.

## Shared component defaults

- Use `PageLayout` and `PageHeader` for standard dashboard pages. Put primary actions in the header's action area.
- Use `Card` for panels, `MetricStrip` for summary cards, and `DataTable` with `TableToolbar` for data grids. Tables retain the same columns and styling during loading, empty, filtered, and error states. A feature supplies data, column contents, and actions.
- Use `Button` with a named variant and size, and `Input` or `Select` for form controls. Prefer control options to page-level padding overrides.
- Use `Modal` for forms and confirmations. Use its drawer variant for side sheets. It owns Escape, backdrop clicks, and focus restoration.
- Keep custom layout only where the interaction requires it. The calendar grid, mailbox folders and reading pane, and floating compose window are feature-specific. They use shared components for general cards, dialogs and form actions.