import { shellTitle } from './lazy-scoped-shell';

const heading = shellTitle;
export function CalendarContent() {
  return <h1>{heading}</h1>;
}
