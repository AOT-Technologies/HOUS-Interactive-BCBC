// repo
import { TESTID_PRE_FOOTER } from "@repo/constants/src/testids";
// local
import "./PreFooter.css";

export default function PreFooter() {
  return (
    <aside className="ui-PreFooter" data-testid={TESTID_PRE_FOOTER}>
      <p className="u-container">
        The B.C. Public Service acknowledges the territories of First Nations
        around B.C. and is grateful to carry out our work on these lands. We
        acknowledge the rights, interests, priorities, and concerns of all
        Indigenous Peoples - First Nations, Métis, and Inuit - respecting and
        acknowledging their distinct cultures, histories, rights, laws, and
        governments.
      </p>
    </aside>
  );
}
