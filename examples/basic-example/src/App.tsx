import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type ComponentPropsWithRef } from 'react';
import { createProp, defineResourceLayout } from '@jfdevelops/react-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card as UiCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type User = {
  id: string;
  name: string;
  role: string;
  description: string;
};

const users: User[] = [
  {
    id: 'ada-lovelace',
    name: 'Ada Lovelace',
    role: 'Admin',
    description: 'Owns platform access and reviews higher-privilege changes.',
  },
  {
    id: 'grace-hopper',
    name: 'Grace Hopper',
    role: 'Manager',
    description: 'Coordinates rollout plans and tracks cross-team approvals.',
  },
];

function Card(props: ComponentPropsWithRef<'div'>) {
  return <UiCard {...props} />;
}

function Title({ className, ...props }: ComponentPropsWithRef<'h2'>) {
  return (
    <h2
      className={cn('leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

function Description({ className, ...props }: ComponentPropsWithRef<'p'>) {
  return (
    <p
      className={cn('text-sm leading-6 text-muted-foreground', className)}
      {...props}
    />
  );
}

const createResourceLayout = defineResourceLayout({
  resources: [
    {
      value: 'users',
      subResources: ['admins', 'managers'],
    },
    'groups',
    'roles',
  ],
  options: {
    title: createProp.string(),
    description: createProp.string(),
  },
  layout: {
    composables: (create) => ({
      Layout: create({
        name: ({ resource, capitalize }) => `${capitalize(resource)}Layout`,
        wrapWith: Card,
      }),
      Title: create({
        name: ({ resource, capitalize }) => `${capitalize(resource)}Title`,
        wrapWith: Title,
      }),
      Description: create({
        name: ({ resource, capitalize }) =>
          `${capitalize(resource)}Description`,
        wrapWith: CardDescription,
      }),
      Content: create({
        name: ({ resource, capitalize }) => `${capitalize(resource)}Content`,
        wrapWith: CardContent,
      }),
    }),
    props: {
      include: {
        title: true,
        description: true,
      },
      custom: {
        children: createProp.component({ type: 'ReactNode' }),
        className: createProp.string().optional(),
      },
    },
    render: (props, { composables, resource }) => {
      return (
        <composables.Layout
          className={cn(
            'border-white/10 bg-card/90 shadow-2xl shadow-black/25 backdrop-blur-md',
            props.className,
          )}
        >
          <CardHeader className='flex justify-between space-y-4'>
            <div className='space-y-2'>
              <composables.Title>{props.title}</composables.Title>
              <composables.Description className='max-w-2xl text-sm leading-6 text-muted-foreground'>
                {props.description}
              </composables.Description>
            </div>
            <div className='text-xs font-medium uppercase tracking-[0.18em] text-lime-300'>
              Resource: <code>{resource}</code>
            </div>
          </CardHeader>
          <composables.Content>{props.children}</composables.Content>
        </composables.Layout>
      );
    },
  },
});

const createUsersPage = createResourceLayout.forResource({ resource: 'users' });
const UsersPage = createUsersPage({
  name: 'UsersPage',
  title: 'Users page',
  description:
    'A single layout factory can produce a page shell for the users resource.',
});
const AdminUsersPage = createUsersPage({
  name: 'AdminUsersPage',
  title: 'Admin users page',
  description:
    'A single layout factory can produce a page shell for the users resource.',
});
const UserDetailPage = UsersPage.makeComposable({
  name: 'UserDetailPage',
});

const GroupsLayout = createResourceLayout({
  resource: 'groups',
  name: 'GroupsLayout',
  title: 'Groups page',
  description:
    'The same factory can map a different resource into a different page surface.',
});

const RolesLayout = createResourceLayout({
  resource: 'roles',
  name: 'RolesLayout',
  title: 'Roles page',
  description:
    'Each page remains a normal React component backed by the shared layout definition.',
});


const navButtonClass = buttonVariants({
  variant: 'ghost',
  size: 'sm',
});

const activeNavButtonClass = buttonVariants({
  variant: 'secondary',
  size: 'sm',
});

function AppShell() {
  return (
    <main className='mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-6 md:py-14'>
      <header className='mb-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between'>
        <div className='space-y-3'>
          <div className='space-y-3'>
            <h1 className='text-4xl font-semibold tracking-tight'>
              Basic Example
            </h1>
            <p className='max-w-2xl text-sm leading-6 text-muted-foreground md:text-base'>
              A basic example where every page is built from{' '}
              <code>createResourceLayout</code>. This example showcases the
              ability to create a page shell for a resource and then reuse it
              for different pages. Navigate through the pages to see the
              different layouts in action.
            </p>
          </div>
        </div>

        <nav className='flex flex-wrap gap-2' aria-label='Example pages'>
          <Link
            to='/'
            className={cn(navButtonClass, 'text-muted-foreground')}
            activeOptions={{ exact: true }}
            activeProps={{ className: activeNavButtonClass }}
          >
            Users
          </Link>
          <Link
            to='/admin-users'
            className={cn(navButtonClass, 'text-muted-foreground')}
            activeProps={{ className: activeNavButtonClass }}
          >
            Admin Users
          </Link>
          <Link
            to='/groups'
            className={cn(navButtonClass, 'text-muted-foreground')}
            activeProps={{ className: activeNavButtonClass }}
          >
            Groups
          </Link>
          <Link
            to='/roles'
            className={cn(navButtonClass, 'text-muted-foreground')}
            activeProps={{ className: activeNavButtonClass }}
          >
            Roles
          </Link>
        </nav>
      </header>

      <Outlet />
    </main>
  );
}

function Users({ users }: { users: User[] }) {
  return (
    <div className='space-y-4'>
      {users.map(({ id, name, description, role }) => (
        <UiCard key={id} className='border-white/10 bg-white/4 shadow-none'>
          <CardHeader className='gap-3 md:flex-row md:items-start md:justify-between'>
            <div className='space-y-2'>
              <CardTitle className='text-xl'>{name}</CardTitle>
              <CardDescription className='max-w-xl text-sm leading-6 text-muted-foreground'>
                {description}
              </CardDescription>
            </div>
            <span className='inline-flex w-fit items-center rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-100'>
              {role}
            </span>
          </CardHeader>
          <CardContent className='flex flex-wrap items-center justify-between gap-3 pt-0'>
            <span className='text-sm text-muted-foreground'>
              Route: <code>/users/{id}</code>
            </span>
            <Button asChild>
              <Link to='/users/$userId' params={{ userId: id }}>
                View user
                <ArrowRight className='size-4' />
              </Link>
            </Button>
          </CardContent>
        </UiCard>
      ))}
    </div>
  );
}

function UsersIndexPage() {
  return (
    <UsersPage className='rounded-3xl'>
      <Users users={users} />
    </UsersPage>
  );
}

function AdminUsers() {
  return (
    <AdminUsersPage className='rounded-3xl'>
      <Users users={users.filter((user) => user.role === 'Admin')} />
    </AdminUsersPage>
  );
}

function UserShowPage() {
  const { userId } = userShowRoute.useParams();
  const user = users.find((entry) => entry.id === userId) ?? users[0];

  return (
    <UserDetailPage>
      <div className='grid gap-4'>
        <div className='flex items-center gap-2'>
          <Button asChild variant='ghost' className='w-fit'>
            <Link to='/'>
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <div className='flex flex-col gap-2'>
            <UserDetailPage.Title>Users / {user.name}</UserDetailPage.Title>
            <UserDetailPage.Description>
              This page is composed from <code>UsersPage.makeComposable</code>.
              This allows you to customize the page any way you want. Here, we
              customized the title and added a back button.
            </UserDetailPage.Description>
          </div>
        </div>

        <UserDetailPage.Content className='space-y-4'>
          <div className='rounded-2xl border border-white/10 bg-black/10 p-4'>
            <p className='mb-2 text-xs font-medium uppercase tracking-[0.18em] text-lime-300'>
              User ID
            </p>
            <p className='text-sm text-foreground/90'>{user.id}</p>
          </div>
          <div className='rounded-2xl border border-white/10 bg-black/10 p-4'>
            <p className='mb-2 text-xs font-medium uppercase tracking-[0.18em] text-lime-300'>
              Layout reuse
            </p>
            <p className='text-sm leading-6 text-muted-foreground'>
              This route is composed from <code>UsersPage.makeComposable</code>,
              so it keeps the same users layout contract.
            </p>
          </div>
        </UserDetailPage.Content>
      </div>
    </UserDetailPage>
  );
}

function GroupsPage() {
  return (
    <GroupsLayout>
      Group-specific content can stay inside the generated layout while reusing
      the same composable structure and prop mapping.
    </GroupsLayout>
  );
}

function RolesPage() {
  return (
    <RolesLayout>
      Roles can define their own route surface without rebuilding the shell,
      title wiring, or layout composables.
    </RolesLayout>
  );
}

const rootRoute = createRootRoute({
  component: AppShell,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: UsersIndexPage,
});

const userShowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users/$userId',
  component: UserShowPage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin-users',
  component: AdminUsers,
});

const groupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups',
  component: GroupsPage,
});

const rolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roles',
  component: RolesPage,
});

const routeTree = rootRoute.addChildren([
  usersRoute,
  userShowRoute,
  adminUsersRoute,
  groupsRoute,
  rolesRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
