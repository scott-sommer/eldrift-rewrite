import { createApplication } from './app/application';

// Feature services are introduced through the backlog; this is the packaging seam.
const application = createApplication([]);
export const loop = (): void => application.tick();
