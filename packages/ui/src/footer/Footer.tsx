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

const ACKNOWLEDGEMENT_TEXT =
  "The B.C. Public Service acknowledges the territories of First Nations around B.C. and is grateful to carry out our work on these lands. We acknowledge the rights, interests, priorities, and concerns of all Indigenous Peoples - First Nations, Métis, and Inuit - respecting and acknowledging their distinct cultures, histories, rights, laws, and governments.";

const CONTACT_TEXT = {
  prefix: "We can help in over 220 languages and through other accessible options. ",
  linkText: "Call, email or text us",
  linkHref: "https://www2.gov.bc.ca/gov/content/home/get-help-with-government-services",
  suffix: ", or find a service centre.",
};

export default function Footer() {
  // Split footer links into two columns
  const midpoint = Math.ceil(URLS_FOOTER.length / 2);
  const firstColumnLinks = URLS_FOOTER.slice(0, midpoint);
  const secondColumnLinks = URLS_FOOTER.slice(midpoint);

  return (
    <footer
      className="ui-Footer"
      id={ID_FOOTER}
      data-testid={TESTID_FOOTER}
    >
      {/* Acknowledgement Bar */}
      <div className="ui-Footer--Acknowledgement">
        <p className="ui-Footer--AcknowledgementText">
          {ACKNOWLEDGEMENT_TEXT}
        </p>
      </div>

      {/* Main Footer Section */}
      <div className="ui-Footer--MainSection">
        <div className="ui-Footer--MainContent">
          <div className="ui-Footer--Content">
            {/* Left Column - Logo and Description */}
            <div className="ui-Footer--Left">
              <Image
                className="ui-Footer--Logo"
                src={"bc-logo.png"}
                alt={"Government of British Columbia Logo - Go to the homepage"}
                width={"146"}
                height={"56"}
              />
              <p className="ui-Footer--Description">
                {CONTACT_TEXT.prefix}
                <a
                  href={CONTACT_TEXT.linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {CONTACT_TEXT.linkText}
                </a>
                {CONTACT_TEXT.suffix}
              </p>
            </div>

            {/* Right Column - Links */}
            <div className="ui-Footer--Right">
              {/* First Link Column with Header */}
              <div className="ui-Footer--LinkColumn">
                <Heading level={2} className="ui-Footer--MoreInfo">
                  More Info
                </Heading>
                {firstColumnLinks.map(({ title, ...rest }) => (
                  <div key={title} className="ui-Footer--NavLink">
                    <Link {...rest}>{title}</Link>
                  </div>
                ))}
              </div>

              {/* Second Link Column (no header, offset top) */}
              <div className="ui-Footer--LinkColumn">
                {secondColumnLinks.map(({ title, ...rest }) => (
                  <div key={title} className="ui-Footer--NavLink">
                    <Link {...rest}>{title}</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Section */}
      <div className="ui-Footer--CopyrightSection">
        <div className="ui-Footer--CopyrightContent">
          <hr className="ui-Footer--Divider" />
          <div className="ui-Footer--CopyrightRow">
            <p className="ui-Footer--Copyright">
              © {new Date().getFullYear()} Government of British Columbia.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
