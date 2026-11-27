import type { RouteObject } from "react-router";
import { Layout } from "./Layout";
import { NotFound } from "./NotFound";
import { ScreenPlaceholder } from "./screens/ScreenPlaceholder";
import { SCREENS } from "./screens/registry";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      ...SCREENS.map((s): RouteObject =>
        s.path === "/"
          ? { index: true, element: <ScreenPlaceholder screen={s} /> }
          : { path: s.path.slice(1), element: <ScreenPlaceholder screen={s} /> },
      ),
      { path: "*", element: <NotFound /> },
    ],
  },
];
