// work — Actions, comments, visits and the project feed (SOP-DEL-03, E5)
// Public API: other modules and apps may import only what this file exports (02-architecture §2).
export { workPermissions } from './permissions.ts';
export { createAction } from './commands/create-action.ts';
export { completeAction } from './commands/complete-action.ts';
export { openActions } from './queries/open-actions.ts';
export { addComment } from './commands/add-comment.ts';
export { commentToAction } from './commands/comment-to-action.ts';
export { recordVisit } from './commands/record-visit.ts';
export { projectFeed } from './queries/project-feed.ts';
