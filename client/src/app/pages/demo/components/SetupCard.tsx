import React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  Spinner,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@patternfly/react-icons";

export type SetupStatus = "checking" | "ready" | "todo";

interface SetupCardProps {
  index: number;
  title: string;
  status: SetupStatus;
  children: React.ReactNode;
}

/**
 * A single numbered step in the demo setup checklist. Renders a Ready /
 * Action-needed label driven by live detection so the whole card lights up
 * green once its prerequisite is satisfied.
 */
export const SetupCard: React.FC<SetupCardProps> = ({
  index,
  title,
  status,
  children,
}) => {
  const { t } = useTranslation();

  const statusLabel =
    status === "checking" ? (
      <Label variant="outline" icon={<Spinner size="sm" />}>
        {t("agentic.demo.checking")}
      </Label>
    ) : status === "ready" ? (
      <Label color="green" icon={<CheckCircleIcon />}>
        {t("agentic.demo.ready")}
      </Label>
    ) : (
      <Label color="orange" icon={<ExclamationTriangleIcon />}>
        {t("agentic.demo.actionNeeded")}
      </Label>
    );

  return (
    <Card isCompact>
      <CardHeader>
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
          style={{ width: "100%" }}
        >
          <FlexItem>
            <CardTitle>{`${index}. ${title}`}</CardTitle>
          </FlexItem>
          <FlexItem>{statusLabel}</FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
};
