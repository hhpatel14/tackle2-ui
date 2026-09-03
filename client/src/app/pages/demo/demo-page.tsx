import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import {
  Button,
  ClipboardCopy,
  Content,
  Flex,
  FlexItem,
  Gallery,
  PageSection,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { ExternalLinkAltIcon } from "@patternfly/react-icons";

import { AdminPaths, DevPaths } from "@app/Paths";
import type { Gateway } from "@app/api/agentic/contract";
import { useDemoTour } from "@app/components/demo-tour/DemoTourContext";
import { readyCondition } from "@app/pages/agent-runs/components/ReadyLabel";
import { isUnverifiableProvider } from "@app/pages/gateways/gateways-page";
import { CreateWorkflowRunModal } from "@app/pages/workflow-runs/components/CreateWorkflowRunModal";
import { useFetchGateways } from "@app/queries/agentic-catalog";
import { useFetchApplications } from "@app/queries/applications";
import { hasSourceCredential } from "@app/utils/agentic";
import { formatPath } from "@app/utils/utils";

import { AgenticGuide } from "./components/AgenticGuide";
import { SetupCard, SetupStatus } from "./components/SetupCard";

/** The prepopulated demo targets these fixed resources. */
const APP_NAME = "coolstore";
const UPSTREAM_REPO = "konveyor/coolstore";
const UPSTREAM_URL = "https://github.com/konveyor/coolstore";
const WORKFLOW_REF = "java-ee-to-quarkus";

/**
 * A gateway the demo can run against. The controller cannot verify Vertex AI
 * or Bedrock (agentic-controller#167), so those park at Ready=False forever
 * yet still work — treat a known-unverifiable provider as usable, everything
 * else only once it reports Ready=True.
 */
function isGatewayUsable(gateway: Gateway): boolean {
  const ready = readyCondition(gateway.status?.conditions);
  if (ready?.status === "True") return true;
  return isUnverifiableProvider(gateway.spec.provider);
}

const DemoPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const tour = useDemoTour();

  const {
    data: applications,
    isFetching: applicationsFetching,
    isSuccess: applicationsLoaded,
  } = useFetchApplications();
  const { gateways, isLoading: gatewaysLoading } = useFetchGateways();

  const [isKickOpen, setIsKickOpen] = useState(false);

  const coolstore = applications.find((a) => a.name === APP_NAME);
  const usableGateway = gateways.find(isGatewayUsable);

  const forkReady = !!coolstore?.repository?.url;
  const tokenReady = !!coolstore && hasSourceCredential(coolstore);
  const providerReady = !!usableGateway;
  const allReady = forkReady && tokenReady && providerReady;

  // Distinguish "still loading" from "loaded and absent" so a card shows a
  // spinner rather than flashing "Action needed" before the first fetch lands.
  const appsSettled = applicationsLoaded || !applicationsFetching;
  const forkStatus: SetupStatus = forkReady
    ? "ready"
    : appsSettled
      ? "todo"
      : "checking";
  const tokenStatus: SetupStatus = tokenReady
    ? "ready"
    : appsSettled
      ? "todo"
      : "checking";
  const providerStatus: SetupStatus = providerReady
    ? "ready"
    : gatewaysLoading && gateways.length === 0
      ? "checking"
      : "todo";

  const openRun = (runName: string) => {
    setIsKickOpen(false);
    history.push(formatPath(DevPaths.workflowRunDetails, { runName }));
  };

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Content>
          <Content component="h1">{t("agentic.demo.title")}</Content>
          <Content component="p">
            <Trans
              i18nKey="agentic.demo.description"
              components={{ strong: <strong /> }}
            />
          </Content>
        </Content>
      </PageSection>

      <PageSection>
        <Stack hasGutter>
          <StackItem>
            <Content component="h2">{t("agentic.demo.setupTitle")}</Content>
          </StackItem>

          <StackItem>
            <Gallery hasGutter minWidths={{ default: "320px" }}>
              <SetupCard
                index={1}
                title={t("agentic.demo.fork.title")}
                status={forkStatus}
              >
                <Stack hasGutter>
                  <StackItem>{t("agentic.demo.fork.body")}</StackItem>
                  <StackItem>
                    <ClipboardCopy
                      isReadOnly
                      hoverTip={t("actions.copy")}
                      clickTip={t("terms.copied")}
                    >
                      {t("agentic.demo.fork.command")}
                    </ClipboardCopy>
                  </StackItem>
                  <StackItem>
                    <Content component="small">
                      {forkReady
                        ? t("agentic.demo.fork.detected", {
                            url: coolstore?.repository?.url,
                          })
                        : t("agentic.demo.fork.missing")}
                    </Content>
                  </StackItem>
                  <StackItem>
                    <Flex spaceItems={{ default: "spaceItemsSm" }}>
                      <FlexItem>
                        <Button
                          variant="link"
                          isInline
                          component="a"
                          href={UPSTREAM_URL}
                          target="_blank"
                          rel="noreferrer"
                          icon={<ExternalLinkAltIcon />}
                          iconPosition="end"
                        >
                          {t("agentic.demo.fork.openGithub")}
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="link"
                          isInline
                          onClick={() => history.push(DevPaths.applications)}
                        >
                          {t("agentic.demo.token.openApp")}
                        </Button>
                      </FlexItem>
                    </Flex>
                  </StackItem>
                </Stack>
              </SetupCard>

              <SetupCard
                index={2}
                title={t("agentic.demo.token.title")}
                status={tokenStatus}
              >
                <Stack hasGutter>
                  <StackItem>{t("agentic.demo.token.body")}</StackItem>
                  <StackItem>
                    <Content component="small">
                      {tokenReady
                        ? t("agentic.demo.token.detected")
                        : t("agentic.demo.token.missing")}
                    </Content>
                  </StackItem>
                  <StackItem>
                    <Flex spaceItems={{ default: "spaceItemsSm" }}>
                      <FlexItem>
                        <Button
                          variant="link"
                          isInline
                          onClick={() => history.push(AdminPaths.identities)}
                        >
                          {t("agentic.demo.token.manage")}
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="link"
                          isInline
                          onClick={() => history.push(DevPaths.applications)}
                        >
                          {t("agentic.demo.token.openApp")}
                        </Button>
                      </FlexItem>
                    </Flex>
                  </StackItem>
                </Stack>
              </SetupCard>

              <SetupCard
                index={3}
                title={t("agentic.demo.provider.title")}
                status={providerStatus}
              >
                <Stack hasGutter>
                  <StackItem>{t("agentic.demo.provider.body")}</StackItem>
                  <StackItem>
                    <Content component="small">
                      {providerReady
                        ? t("agentic.demo.provider.detected", {
                            name: usableGateway?.metadata.name,
                          })
                        : t("agentic.demo.provider.missing")}
                    </Content>
                  </StackItem>
                  <StackItem>
                    <Button
                      variant="link"
                      isInline
                      onClick={() => history.push(DevPaths.gateways)}
                    >
                      {t("agentic.demo.provider.manage")}
                    </Button>
                  </StackItem>
                </Stack>
              </SetupCard>
            </Gallery>
          </StackItem>

          <StackItem>
            <Content component="h2">{t("agentic.demo.start.title")}</Content>
          </StackItem>
          <StackItem>
            <Flex
              spaceItems={{ default: "spaceItemsMd" }}
              alignItems={{ default: "alignItemsCenter" }}
            >
              <FlexItem>
                <Button
                  variant="primary"
                  isDisabled={tour.isActive}
                  onClick={() =>
                    tour.start({
                      applicationName: APP_NAME,
                      upstreamRepo: UPSTREAM_REPO,
                      forkUrl: coolstore?.repository?.url,
                      workflowRef: WORKFLOW_REF,
                    })
                  }
                >
                  {t("agentic.demo.start.guided")}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="secondary"
                  isDisabled={!allReady}
                  onClick={() => setIsKickOpen(true)}
                >
                  {t("agentic.demo.start.kick")}
                </Button>
              </FlexItem>
            </Flex>
          </StackItem>
          <StackItem>
            <Content component="small">
              {allReady
                ? t("agentic.demo.start.kickHint")
                : t("agentic.demo.start.blocked")}
            </Content>
          </StackItem>
          <StackItem>
            <Content component="small">
              {t("agentic.demo.start.guidedHint")}
            </Content>
          </StackItem>
        </Stack>
      </PageSection>

      <PageSection>
        <AgenticGuide />
      </PageSection>

      {isKickOpen && (
        <CreateWorkflowRunModal
          initialWorkflow={WORKFLOW_REF}
          application={coolstore}
          onClose={() => setIsKickOpen(false)}
          onCreated={openRun}
        />
      )}
    </>
  );
};

export default DemoPage;
