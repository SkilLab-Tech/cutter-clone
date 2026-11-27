import type { RouteObject } from "react-router";
import { Layout } from "./Layout";
import { NotFound } from "./NotFound";
import { ScreenPlaceholder } from "./screens/ScreenPlaceholder";
import { SCREENS } from "./screens/registry";
import { SmokePage } from "./smoke/SmokePage";

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
      // Hidden gate G-1 page (T-010); not in the navigation.
      { path: "smoke", element: <SmokePage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];
