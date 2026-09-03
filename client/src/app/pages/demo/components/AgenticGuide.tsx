import React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Content,
  ExpandableSection,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { DevPaths } from "@app/Paths";

/** The Agentic pages, in sidebar order, each keyed to its i18n guide entry. */
const GUIDE_PAGES: { key: string; path: string }[] = [
  { key: "agentRuns", path: DevPaths.agentRuns },
  { key: "agents", path: DevPaths.agents },
  { key: "skills", path: DevPaths.skills },
  { key: "workflows", path: DevPaths.workflows },
  { key: "workflowRuns", path: DevPaths.workflowRuns },
  { key: "gateways", path: DevPaths.gateways },
];

/**
 * A static reference that explains every page under the Agentic tab and the
 * main actions available on each. Kept intentionally simple (no live DOM
 * driving) so it never breaks as the pages evolve.
 */
export const AgenticGuide: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <Stack hasGutter>
      <StackItem>
        <Content component="h2">{t("agentic.demo.guide.title")}</Content>
        <Content component="p">{t("agentic.demo.guide.intro")}</Content>
      </StackItem>
      <StackItem>
        <Card isCompact>
          <CardBody>
            <Stack hasGutter>
              {GUIDE_PAGES.map(({ key, path }) => (
                <StackItem key={key}>
                  <ExpandableSection
                    toggleText={t(`agentic.demo.guide.${key}.name`)}
                  >
                    <Stack hasGutter>
                      <StackItem>
                        <Content component="p">
                          {t(`agentic.demo.guide.${key}.desc`)}
                        </Content>
                        <Content component="small">
                          {t(`agentic.demo.guide.${key}.actions`)}
                        </Content>
                      </StackItem>
                      <StackItem>
                        <Button
                          variant="link"
                          isInline
                          onClick={() => history.push(path)}
                        >
                          {t("agentic.demo.guide.open")}
                        </Button>
                      </StackItem>
                    </Stack>
                  </ExpandableSection>
                </StackItem>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
};
