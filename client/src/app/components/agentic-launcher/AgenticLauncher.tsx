import React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { ArrowRightIcon, TimesIcon } from "@patternfly/react-icons";

import { isAgenticEnabled } from "@app/Constants";
import { DevPaths } from "@app/Paths";
import { useLocalStorage } from "@app/hooks/useStorage";

import "./agentic-launcher.css";

const DISMISS_KEY = "agentic-launcher-dismissed";

/**
 * A small floating card, shown app-wide when Agentic is enabled, that nudges
 * first-time users toward the Get started page. It is dismissible and the
 * choice is remembered in localStorage, and it hides itself on the Get
 * started page (where it would be redundant).
 */
export const AgenticLauncher: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const [dismissed, setDismissed] = useLocalStorage<boolean>({
    key: DISMISS_KEY,
    defaultValue: false,
  });

  if (!isAgenticEnabled || dismissed) return null;
  if (location.pathname === DevPaths.agenticDemo) return null;

  return (
    <div className="agentic-launcher">
      <Card isCompact>
        <CardHeader
          actions={{
            actions: (
              <Button
                variant="plain"
                aria-label={t("agentic.demo.launcher.dismiss")}
                onClick={() => setDismissed(true)}
                icon={<TimesIcon />}
              />
            ),
          }}
        >
          <CardTitle>{t("agentic.demo.launcher.title")}</CardTitle>
        </CardHeader>
        <CardBody>
          <Stack hasGutter>
            <StackItem>
              <Content component="small">
                {t("agentic.demo.launcher.body")}
              </Content>
            </StackItem>
            <StackItem>
              <Button
                variant="primary"
                onClick={() => history.push(DevPaths.agenticDemo)}
                icon={<ArrowRightIcon />}
                iconPosition="end"
              >
                {t("agentic.demo.launcher.open")}
              </Button>
            </StackItem>
          </Stack>
        </CardBody>
      </Card>
    </div>
  );
};
