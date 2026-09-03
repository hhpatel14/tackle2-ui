import * as React from "react";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "./Routes";
import { NotificationsProvider } from "./components/NotificationsContext";
import { DemoTourProvider } from "./components/demo-tour/DemoTourContext";
import { TaskManagerProvider } from "./components/task-manager/TaskManagerContext";
import { DefaultLayout } from "./layout";

import "./app.css";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationsProvider>
        <TaskManagerProvider>
          <DemoTourProvider>
            <DefaultLayout>
              <AppRoutes />
            </DefaultLayout>
          </DemoTourProvider>
        </TaskManagerProvider>
      </NotificationsProvider>
    </BrowserRouter>
  );
};

export default App;
