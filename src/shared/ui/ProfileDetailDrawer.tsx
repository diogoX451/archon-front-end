import type { ConversationProfileV2 } from "@shared/api/profiles";
import { ProfileDetail, ProfileHeader } from "./ProfileDetail";

interface Props {
  open: boolean;
  profile: ConversationProfileV2 | null;
  onClose: () => void;
}

// Chrome for ProfileDetail — backdrop + fixed side drawer. Kept thin so
// the same content also renders inline inside the workflow builder's
// Inspector "Profile" tab.
export function ProfileDetailDrawer({ open, profile, onClose }: Props) {
  if (!open || !profile) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .pd-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 90; }
        .pd-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(720px, 100vw); background: var(--surface); border-left: 1px solid var(--line); z-index: 91; display: flex; flex-direction: column; box-shadow: var(--shadow-3); }
        .pd-head { padding: 14px 18px; border-bottom: 1px solid var(--line); display: flex; gap: 10px; align-items: flex-start; }
        .pd-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
      `}} />
      <div className="pd-backdrop" onClick={onClose} />
      <aside className="pd-drawer">
        <div className="pd-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <ProfileHeader profile={profile} />
          </div>
          <button type="button" className="btn ghost" onClick={onClose} style={{ padding: "4px 10px" }}>Fechar</button>
        </div>
        <div className="pd-body">
          <ProfileDetail profile={profile} />
        </div>
      </aside>
    </>
  );
}
