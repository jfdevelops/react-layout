import type { ComponentProps } from 'react';
import { createProp, defineResourceLayout } from '../../src';

type IsAny<Value> = 0 extends 1 & Value ? true : false;
type IsEqual<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() =>
    Value extends Right ? 1 : 2
    ? true
    : false;

const { createResourceLayout } = defineResourceLayout({
  resources: ['appointments'],
  options: {
    title: createProp.string(),
  },
  layout: {
    props: {
      include: { title: true },
    },
    render: () => null as never,
  },
});

const CalendarPage = createResourceLayout
  .forResources('appointments')
  .createComponent({
    props: {
      include: { title: true },
    },
    resources: {
      appointments: {
        render: () => null as never,
      },
    },
    render: () => null as never,
  });

const AppointmentsPage = CalendarPage.asHOF()('appointments');

type AppointmentsPageProps = ComponentProps<typeof AppointmentsPage>;

const propsAreAny: IsAny<AppointmentsPageProps> = false;
const titleIsString: IsEqual<AppointmentsPageProps['title'], string> = true;
const hasStringIndex: string extends keyof AppointmentsPageProps ? true : false =
  false;

void propsAreAny;
void titleIsString;
void hasStringIndex;
