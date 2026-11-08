import { META } from "../../meta";
import { Modal } from "../../ui/components/Modal";
import { Shimmer } from "../../ui/components/Shimmer";
import { Switch } from "../../ui/components/Switch";
import { featureStatuses, setFeatureEnabled, type FeatureState, type FeatureStatus } from "../runner";
import styles from "./SettingsPanel.module.css";
import { settingsOpen } from "./state";

function describe(state: FeatureState): string {
  switch (state.kind) {
    case "running":
      return "Running";
    case "off":
      return "Off";
    case "waiting":
      return `Idle: ${state.reason}`;
    case "error":
      return `Error: ${state.message}`;
  }
}

function FeatureRow({ status }: { status: FeatureStatus }) {
  const nameId = `rxe-feature-${status.id}`;
  return (
    <li className={styles.feature}>
      <span id={nameId} className={styles.name}>
        {status.name}
      </span>
      <Switch
        checked={status.enabled}
        onChange={(enabled) => setFeatureEnabled(status.id, enabled)}
        labelledBy={nameId}
        describedBy={`${nameId}-description`}
      />
      <p id={`${nameId}-description`} className={styles.description}>
        {status.description}
      </p>
      <span className={styles.state} data-state={status.state.kind}>
        {describe(status.state)}
      </span>
    </li>
  );
}

const close = () => {
  settingsOpen.value = false;
};

export function SettingsPanel() {
  const toggleable = featureStatuses.value.filter((status) => !status.locked);
  return (
    <Modal
      open={settingsOpen.value}
      onClose={close}
      title={
        <>
          <Shimmer>RxE</Shimmer> Settings
          <span className={styles.version}>v{META.version}</span>
        </>
      }
    >
      <ul className={styles.features}>
        {toggleable.map((status) => (
          <FeatureRow key={status.id} status={status} />
        ))}
      </ul>
    </Modal>
  );
}
