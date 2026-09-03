import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { Alert, AlertActionCloseButton, Button } from "@patternfly/react-core";

import { DevPaths } from "@app/Paths";

import { HandCursor } from "./HandCursor";

import "./demo-tour.css";

export interface DemoTourOptions {
  applicationName: string;
  upstreamRepo: string;
  /** The registered fork URL, when a coolstore application already exists. */
  forkUrl?: string;
  workflowRef: string;
}

interface DemoTourContextValue {
  isActive: boolean;
  start: (opts: DemoTourOptions) => void;
  stop: () => void;
}

const DemoTourContext = createContext<DemoTourContextValue | undefined>(
  undefined
);

/**
 * Access the guided demo. The provider mounts at the app root; if it is
 * somehow absent the hook degrades to a no-op so a page using it never
 * crashes.
 */
export const useDemoTour = (): DemoTourContextValue => {
  const ctx = useContext(DemoTourContext);
  return (
    ctx ?? { isActive: false, start: () => undefined, stop: () => undefined }
  );
};

/** Thrown to unwind the runner when the tour is stopped or superseded. */
class TourAborted extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// How long each narration beat stays on screen before the tour advances —
// long enough to comfortably read the information box.
const READ_MS = 3000;

const fire = (el: Element, type: string) =>
  el.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, view: window })
  );

/** Set a controlled input/textarea value so React-Hook-Form registers it. */
function driveInput(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Select the option whose text contains `substr`; returns true on success. */
function selectOptionByText(el: HTMLSelectElement, substr: string): boolean {
  const option = Array.from(el.options).find((o) =>
    o.textContent?.toLowerCase().includes(substr.toLowerCase())
  );
  if (!option) return false;
  Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  )?.set?.call(el, option.value);
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export const DemoTourProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const history = useHistory();

  const [isActive, setIsActive] = useState(false);
  const [hand, setHand] = useState({ x: -100, y: -100 });
  const [clickSeq, setClickSeq] = useState(0);
  const [narration, setNarration] = useState("");
  const [paused, setPaused] = useState<{ detail: string } | null>(null);

  // Monotonic run token: a new start() or stop() bumps it, so any in-flight
  // runner (comparing against its captured value) unwinds on its next await.
  const runRef = useRef(0);
  // Resolver for the promise a paused runner is parked on.
  const resumeRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    runRef.current += 1;
    resumeRef.current?.();
    resumeRef.current = null;
    setIsActive(false);
    setPaused(null);
    setNarration("");
    setHand({ x: -100, y: -100 });
  }, []);

  const start = useCallback(
    (opts: DemoTourOptions) => {
      const myRun = (runRef.current += 1);
      const alive = () => runRef.current === myRun;
      setIsActive(true);
      setPaused(null);
      setNarration("");

      const ensureAlive = () => {
        if (!alive()) throw new TourAborted();
      };

      const visible = (el: Element | null): el is HTMLElement =>
        !!el && (el as HTMLElement).offsetParent !== null;

      const waitEl = async (
        selector: string,
        timeoutMs = 12000
      ): Promise<HTMLElement | null> => {
        const end = Date.now() + timeoutMs;
        while (Date.now() < end) {
          ensureAlive();
          const el = document.querySelector(selector);
          if (visible(el)) return el;
          await sleep(150);
        }
        return null;
      };

      const waitUntil = async (
        pred: () => boolean,
        timeoutMs = 12000
      ): Promise<boolean> => {
        const end = Date.now() + timeoutMs;
        while (Date.now() < end) {
          ensureAlive();
          if (pred()) return true;
          await sleep(150);
        }
        return false;
      };

      // Wait for a visible table cell (or link) whose trimmed text equals
      // `text` — used to point at an existing row (e.g. the workflow catalog).
      const waitCell = async (
        text: string,
        timeoutMs = 12000
      ): Promise<HTMLElement | null> => {
        const end = Date.now() + timeoutMs;
        while (Date.now() < end) {
          ensureAlive();
          const cell = Array.from(
            document.querySelectorAll<HTMLElement>("td a, td")
          ).find((e) => visible(e) && e.textContent?.trim() === text);
          if (cell) return cell;
          await sleep(150);
        }
        return null;
      };

      const moveTo = (el: HTMLElement) => {
        el.scrollIntoView({ block: "center", inline: "center" });
        const r = el.getBoundingClientRect();
        setHand({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      };

      const point = async (
        el: HTMLElement | null,
        text: string,
        dwellMs = READ_MS
      ) => {
        setNarration(text);
        if (el) moveTo(el);
        await sleep(dwellMs);
        ensureAlive();
      };

      const click = async (el: HTMLElement) => {
        moveTo(el);
        await sleep(450);
        ensureAlive();
        setClickSeq((s) => s + 1);
        fire(el, "mousedown");
        fire(el, "mouseup");
        el.click();
        await sleep(500);
        ensureAlive();
      };

      // Park until the user clicks "Skip step" (resolve) or "Stop" (which
      // bumps runRef, so ensureAlive throws right after).
      const pause = (detail: string) =>
        new Promise<void>((resolve) => {
          setPaused({ detail });
          resumeRef.current = () => {
            setPaused(null);
            resumeRef.current = null;
            resolve();
          };
        });

      const appExists = () =>
        Array.from(document.querySelectorAll("td a, td")).some(
          (e) => e.textContent?.trim() === opts.applicationName
        );

      // The "Create workflow run" button carries no stable id — find it by
      // its accessible text among the currently visible buttons.
      const findCreateRunButton = async (
        timeoutMs = 12000
      ): Promise<HTMLElement | null> => {
        const label = t("agentic.workflowRuns.create").toLowerCase();
        const end = Date.now() + timeoutMs;
        while (Date.now() < end) {
          ensureAlive();
          const btn = Array.from(
            document.querySelectorAll<HTMLElement>("button")
          ).find(
            (b) => visible(b) && b.textContent?.trim().toLowerCase() === label
          );
          if (btn) return btn;
          await sleep(150);
        }
        return null;
      };

      const run = async () => {
        // 1 — Application inventory.
        history.push(DevPaths.applications);
        const createBtn = await waitEl("#create-application");
        if (!createBtn) {
          await pause(t("agentic.demo.tour.prereqFork"));
          return;
        }
        await point(createBtn, t("agentic.demo.tour.navApplications"));

        // 2 — Create the app unless it already exists.
        if (appExists()) {
          await point(
            createBtn,
            t("agentic.demo.tour.appExists", {
              name: opts.applicationName,
            })
          );
        } else {
          await click(createBtn);
          const nameInput = (await waitEl("#name")) as HTMLInputElement | null;
          if (!nameInput) {
            await pause(t("agentic.demo.tour.pausedBody", { detail: "" }));
            return;
          }
          await point(nameInput, t("agentic.demo.tour.openCreate"));

          // The Source code section is collapsed by default.
          if (!visible(document.querySelector("#sourceRepository"))) {
            const label = t("terms.sourceCode").toLowerCase();
            const toggle = Array.from(
              document.querySelectorAll<HTMLElement>(
                ".pf-v6-c-expandable-section__toggle"
              )
            ).find((b) => b.textContent?.toLowerCase().includes(label));
            if (toggle) await click(toggle);
          }

          driveInput(nameInput, opts.applicationName);
          const repo = (await waitEl(
            "#sourceRepository"
          )) as HTMLInputElement | null;
          if (repo) {
            await point(repo, t("agentic.demo.tour.fillForm"));
            driveInput(
              repo,
              opts.forkUrl ?? `https://github.com/${opts.upstreamRepo}`
            );
            const branch = document.querySelector<HTMLInputElement>("#branch");
            if (branch) driveInput(branch, "main");
          }

          const submit = await waitEl("#submit");
          if (submit) {
            await point(
              submit,
              t("agentic.demo.tour.submitApp", { name: opts.applicationName })
            );
            await click(submit);
            await waitUntil(appExists, 15000);
          }
        }

        // 3 — Analysis (narration only; kept fast and reliable).
        await point(null, t("agentic.demo.tour.analysis"));
        await sleep(600);

        // 3b — Show that the migration workflow already exists, so it's clear
        // the next step reuses it rather than building one on the fly.
        history.push(DevPaths.workflows);
        await point(null, t("agentic.demo.tour.navWorkflows"));
        const wfCell = await waitCell(opts.workflowRef);
        await point(
          wfCell,
          t("agentic.demo.tour.showWorkflow", { workflow: opts.workflowRef })
        );

        // 4 — Workflow runs → create run.
        history.push(DevPaths.workflowRuns);
        await point(null, t("agentic.demo.tour.navWorkflowRuns"));
        await point(
          null,
          t("agentic.demo.tour.premadeWorkflow", { workflow: opts.workflowRef })
        );
        const openRunBtn = await findCreateRunButton();
        if (!openRunBtn) {
          await pause(t("agentic.demo.tour.pausedBody", { detail: "" }));
          return;
        }
        await point(openRunBtn, t("agentic.demo.tour.openCreateRun"));
        await click(openRunBtn);

        const workflowSelect = (await waitEl(
          "#create-workflow"
        )) as HTMLSelectElement | null;
        if (!workflowSelect) {
          await pause(t("agentic.demo.tour.pausedBody", { detail: "" }));
          return;
        }
        await point(
          workflowSelect,
          t("agentic.demo.tour.fillRun", {
            workflow: opts.workflowRef,
            name: opts.applicationName,
          })
        );
        selectOptionByText(workflowSelect, opts.workflowRef);

        const appSelect = document.querySelector<HTMLSelectElement>(
          "#create-pb-application"
        );
        if (appSelect) selectOptionByText(appSelect, opts.applicationName);

        const submitRun = (await waitEl(
          "#create-workflow-run-submit"
        )) as HTMLButtonElement | null;
        if (!submitRun) {
          await pause(t("agentic.demo.tour.pausedBody", { detail: "" }));
          return;
        }
        // Give the form a beat to validate after the programmatic changes.
        await sleep(600);
        if (submitRun.disabled) {
          await pause(t("agentic.demo.tour.prereqProvider"));
          return;
        }
        await point(submitRun, t("agentic.demo.tour.submitRun"));
        await click(submitRun);

        // 5 — The page deep-links to the run on success.
        await waitUntil(
          () => window.location.pathname.startsWith("/workflow-runs/"),
          15000
        );
        setNarration(t("agentic.demo.tour.done"));
        setHand({ x: -100, y: -100 });
        await sleep(READ_MS);
        if (alive()) stop();
      };

      run().catch((err) => {
        if (err instanceof TourAborted) return;
        // Any unexpected failure parks the tour rather than throwing into a
        // detached promise; the user can stop or skip from the card.
        if (alive()) setPaused({ detail: String(err) });
      });
    },
    [history, t, stop]
  );

  return (
    <DemoTourContext.Provider value={{ isActive, start, stop }}>
      {children}
      {isActive && (
        <>
          <HandCursor x={hand.x} y={hand.y} clickSeq={clickSeq} />
          {(narration || paused) && (
            <div
              className="demo-tour-narration"
              key={paused ? "paused" : narration}
            >
              <Alert
                variant={paused ? "warning" : "info"}
                isInline
                title={
                  paused
                    ? t("agentic.demo.tour.pausedTitle")
                    : t("agentic.demo.title")
                }
                actionClose={<AlertActionCloseButton onClose={stop} />}
                actionLinks={
                  <>
                    {paused && (
                      <Button
                        variant="link"
                        isInline
                        onClick={() => resumeRef.current?.()}
                      >
                        {t("agentic.demo.tour.resume")}
                      </Button>
                    )}
                    <Button variant="link" isInline onClick={stop}>
                      {t("agentic.demo.tour.stop")}
                    </Button>
                  </>
                }
              >
                {paused
                  ? t("agentic.demo.tour.pausedBody", { detail: paused.detail })
                  : narration}
              </Alert>
            </div>
          )}
        </>
      )}
    </DemoTourContext.Provider>
  );
};
