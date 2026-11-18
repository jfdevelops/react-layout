import { z } from 'zod';
import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const { createReusable } = createDefinedResourceLayout({
  resources: ['panedeck', 'material-ui-helper', 'jfdevelops'],
  options: {
    meta: z.object({
      owner: z.string(),
      repo: z.string(),
    }),
  },
});

export const createUrl = createReusable({
  props: {
    include: {
      options: {
        meta: true,
      },
    },
    custom: {
      protocol: z.enum(['https', 'http']),
    },
  },
  fn: ({ meta, protocol }) =>
    `${protocol}://github.com/${meta.owner}/${meta.repo}`,
});

export const url = createUrl({
  meta: {
    owner: 'jfdevelops',
    repo: 'react-layout',
  },
  protocol: 'https',
});
