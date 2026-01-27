"use client";
// 3rd party
import { Heading } from "react-aria-components";
// repo
import { ID_FOOTER } from "@repo/constants/src/ids";
import { URLS_FOOTER } from "@repo/constants/src/urls";
import { TESTID_FOOTER } from "@repo/constants/src/testids";
// local
import Link from "../link/Link";
import Image from "../image/Image";
import "./Footer.css";

export default function Footer() {
  return (
    <footer
      className="u-container ui-Footer u-show-footer-skip-link"
      id={ID_FOOTER}
      data-testid={TESTID_FOOTER}
    >
      <div className="ui-Footer--Main">
        <div className="ui-Footer--Left">
          <Image
            src={"bc-logo.png"}
            alt={"Government of British Columbia Logo - Go to the homepage"}
            width={"156"}
            height={"60"}
          />
          <p className="ui-Footer--Content">
            Please contact your local government for more information on
            detailed building code directives for your area.
          </p>
        </div>
        <div className="ui-Footer--Right">
          <Heading level={2} className="ui-Footer--MoreInfo">
            MORE INFO
          </Heading>
          <ul className="ui-Footer--MoreInfoLinks">
            {URLS_FOOTER.map(({ title, ...rest }) => (
              <li key={title}>
                <Link {...rest}>{title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="ui-Footer--Copyright">
        &copy; {new Date().getFullYear()} Government of British Columbia.
      </p>
    </footer>
  );
}
