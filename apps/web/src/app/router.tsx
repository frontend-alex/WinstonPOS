import { createBrowserRouter, Navigate } from "react-router";
import { LeadsPanel } from "@/features/map";
import { SettingsPanel } from "@/features/settings";
import { EmptyPanel } from "@/features/sidebar";
import { RootLayout } from "./root-layout";

export const router = createBrowserRouter([
	{
		path: "/",
		element: <RootLayout />,
		children: [
			{ index: true, element: <Navigate to="/leads" replace /> },
			{ path: "overview", element: <EmptyPanel title="Overview" /> },
			{ path: "leads", element: <LeadsPanel /> },
			{ path: "contacts", element: <EmptyPanel title="Contacts" /> },
			{ path: "reports", element: <EmptyPanel title="Reports" /> },
			{ path: "messages", element: <EmptyPanel title="Messages" /> },
			{ path: "settings", element: <SettingsPanel /> },
			{ path: "*", element: <Navigate to="/leads" replace /> },
		],
	},
]);
