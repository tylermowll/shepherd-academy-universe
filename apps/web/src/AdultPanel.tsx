import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Schema } from "./client";
import { type Navigate } from "./navigation";
import { LearnerAccounts } from "./LearnerAccounts";
import {
  ProviderConnections,
  type ProviderSettingsSection,
} from "./ProviderConnections";

type Props = {
  learner: string;
  learners: Schema<"LearnerPublic">[];
  onLearner: (id: string) => void;
  onRefresh: () => Promise<void>;
  page: "learners" | "settings" | "help";
  onNavigate: Navigate;
  act: (action: () => Promise<void>) => Promise<void>;
  administrator: string;
  onSessionChange: (session: Schema<"SessionStatus">) => void;
};

const providerSettingsSteps: Array<{
  id: ProviderSettingsSection;
  label: string;
  description: string;
}> = [
  { id: "models", label: "Models", description: "Add, test and activate AI" },
  {
    id: "policy",
    label: "Data & privacy",
    description: "Cloud access and age groups",
  },
];

function processingLocation(provider?: Schema<"ProviderPublic">) {
  if (!provider) return "Not available";
  if (provider.boundary === "synthetic") return "Synthetic demo";
  if (provider.boundary === "local_network") return "Your local network";
  if (provider.boundary === "cloud") return "Cloud provider";
  return provider.boundary;
}

export function AdultPanel({
  learner,
  learners,
  onLearner,
  onRefresh,
  page,
  onNavigate,
  act,
  administrator,
  onSessionChange,
}: Props) {
  const [learnersVisited, setLearnersVisited] = useState(page === "learners");
  if (page === "learners" && !learnersVisited) setLearnersVisited(true);
  const [providers, setProviders] = useState<Schema<"ProvidersPublic"> | null>(
    null,
  );
  const [settingsSection, setSettingsSection] =
    useState<ProviderSettingsSection>("models");
  const [loadFailed, setLoadFailed] = useState(false);
  const [modelsBusy, setModelsBusy] = useState(false);
  const refreshSequence = useRef(0);
  const focusSettingsContent = useRef(false);
  const settingsTabs = useRef<Array<HTMLButtonElement | null>>([]);
  const refreshProviders = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    let result: Schema<"ProvidersPublic">;
    try {
      result = await api<Schema<"ProvidersPublic">>("/admin/providers");
    } catch (cause) {
      if (sequence === refreshSequence.current) setLoadFailed(true);
      throw cause;
    }
    if (sequence !== refreshSequence.current) return;
    setProviders(result);
    setLoadFailed(false);
  }, []);
  useEffect(() => {
    if (page === "settings") void act(refreshProviders);
    return () => {
      refreshSequence.current += 1;
    };
  }, [act, page, refreshProviders]);
  const chooseSettingsSection = (
    next: ProviderSettingsSection,
    focusContent = false,
  ) => {
    focusSettingsContent.current = focusContent;
    setSettingsSection(next);
  };
  useEffect(() => {
    if (page !== "settings" || !focusSettingsContent.current) return;
    focusSettingsContent.current = false;
    document.getElementById(`settings-${settingsSection}-heading`)?.focus();
  }, [page, settingsSection]);

  return (
    <section className="admin" hidden={page === "help"}>
      <div hidden={page !== "learners"}>
        {(learnersVisited || page === "learners") && (
          <LearnerAccounts
            key={learner || "no-learner"}
            learner={learner}
            learners={learners}
            onLearner={onLearner}
            onRefresh={onRefresh}
            act={act}
            administrator={administrator}
            onSessionChange={onSessionChange}
            active={page === "learners"}
          />
        )}
      </div>
      <div hidden={page !== "settings"}>
        {!providers ? (
          loadFailed ? (
            <button onClick={() => void act(refreshProviders)}>
              Retry AI settings
            </button>
          ) : (
            <p role="status">Loading AI settings…</p>
          )
        ) : (
          <div className="settings-workflow">
            <section
              className="card current-models"
              aria-label="Current models"
            >
              <h2>Current models</h2>
              <dl className="readiness-list">
                {(["tutor", "vision"] as const).map((stage) => {
                  const provider = providers.providers.find(
                    (item) => item.id === providers.routes[stage],
                  );
                  return (
                    <div key={stage}>
                      <dt>
                        Current {stage === "tutor" ? "tutor" : "photo reader"}
                      </dt>{" "}
                      <dd>
                        {provider ? (
                          <>
                            {provider.id} / {provider.model}
                            <br />
                            <span className="fine">
                              {processingLocation(provider)}
                              {provider.adapter === "mock"
                                ? " · Sample responses only"
                                : ""}
                              {provider.requires_approval
                                ? " · Activation needed"
                                : ""}
                            </span>
                          </>
                        ) : (
                          `${providers.routes[stage] || "None selected"} (unavailable)`
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="fine">
                These are the saved choices for every learner. Changed
                connections need testing and activation before use. Earlier
                activities and replies stay as they were.
              </p>
              <button
                disabled={modelsBusy}
                onClick={() => void act(refreshProviders)}
              >
                Refresh status
              </button>
              {loadFailed && (
                <p role="status" className="error">
                  Current model status could not refresh. The last saved choices
                  are shown. Refresh status before changing models.
                </p>
              )}
            </section>
            <div
              className="settings-tabs"
              role="tablist"
              aria-label="AI settings"
            >
              {providerSettingsSteps.map((step, index) => (
                <button
                  key={step.id}
                  ref={(element) => {
                    settingsTabs.current[index] = element;
                  }}
                  id={`settings-tab-${step.id}`}
                  type="button"
                  role="tab"
                  aria-selected={settingsSection === step.id}
                  aria-controls="provider-settings-panel"
                  tabIndex={settingsSection === step.id ? 0 : -1}
                  onClick={() => chooseSettingsSection(step.id)}
                  onKeyDown={(event) => {
                    let next: number;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % providerSettingsSteps.length;
                    else if (event.key === "ArrowLeft")
                      next =
                        (index - 1 + providerSettingsSteps.length) %
                        providerSettingsSteps.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End")
                      next = providerSettingsSteps.length - 1;
                    else return;
                    event.preventDefault();
                    chooseSettingsSection(providerSettingsSteps[next]!.id);
                    settingsTabs.current[next]?.focus();
                  }}
                >
                  <span>
                    <strong>{step.label}</strong>
                    <small>{step.description}</small>
                  </span>
                </button>
              ))}
            </div>
            <div
              id="provider-settings-panel"
              role="tabpanel"
              aria-labelledby={`settings-tab-${settingsSection}`}
            >
              <ProviderConnections
                configuration={providers}
                section={settingsSection}
                onSectionChange={chooseSettingsSection}
                onNavigate={onNavigate}
                act={act}
                onChanged={refreshProviders}
                statusStale={loadFailed}
                onBusyChange={setModelsBusy}
                onRoutesChanged={(routes) =>
                  setProviders((current) =>
                    current ? { ...current, routes } : current,
                  )
                }
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
