"use client";

import React, { useEffect, useRef } from "react";
import {
  GlossaryType,
  GlossaryContentType,
  GlossaryDefinitionListType,
} from "@repo/data/useGlossaryData";
import { parseStringToComponents } from "web/utils/string";
import { DEFINED_TERMS_SECTION_NUMBER } from "@repo/constants/src/constants";
import { Heading } from "react-aria-components";
import "./ModalGlossaryContent.css";
import Icon from "../icon/Icon";
import Button from "../button/Button";

interface GlossaryContentProps {
  modalData: GlossaryType[];
  highlightedSection: string | null;
  sectionRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>;
  setFocusSection: (section: string) => void;
}

function renderDefinitionList(
  definitionList: GlossaryDefinitionListType[],
  customHandler?: (location: string) => void,
) {
  return (
    <ul className="ui-ModalSide--List">
      {definitionList.map((item, index) => (
        <li key={index}>
          {parseStringToComponents(item.definition, customHandler)}
          {item.definitionList && renderDefinitionList(item.definitionList)}
        </li>
      ))}
    </ul>
  );
}

const GlossaryContent: React.FC<GlossaryContentProps> = ({
  modalData,
  highlightedSection,
  sectionRefs,
  setFocusSection,
}) => {
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightedSection && sectionRefs.current[highlightedSection]) {
      sectionRefs.current[highlightedSection]?.focus();
    }
    if (highlightedSection && liveRegionRef.current) {
      liveRegionRef.current.innerText = `Scroll or tab to navigate to new terms.`;
    }
  }, [highlightedSection]);

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="ui-ModalSide--Parts --glossary">
      <article className="ui-ModalSide--Subsection">
        <header className="ui-ModalSide--SectionHeaderLine">
          <Heading level={2} className="ui-ModalSide--SubsectionHeader">
            <span className="ui-ModalSide--SubsectionNumber">
              {DEFINED_TERMS_SECTION_NUMBER}{" "}
            </span>
            Defined Terms
            <Button
              variant="secondary"
              onPress={() => handleDownload()}
              aria-label={`Download Building Code Section 1.4.1.2 Defined Terms`}
              className="ui-ModalSide-pdfButton"
            >
              <Icon type="download" />
              <span>PDF</span>
            </Button>
          </Heading>
        </header>
        <span
          ref={liveRegionRef}
          aria-live="assertive"
          className="ui-ModalSide--LiveRegion"
        ></span>
        <ol>
          {modalData.map(
            (data, index) =>
              !data.content?.hideTerm && (
                <li
                  key={index}
                  ref={(el) => {
                    sectionRefs.current[data.reference] = el;
                  }}
                  className={`ui-ModalSide--Article ${
                    highlightedSection === data.reference
                      ? "ui-ModalSide--SectionHighlighted"
                      : ""
                  }`}
                  tabIndex={-1}
                >
                  {parseStringToComponents(
                    (data.content as GlossaryContentType).definition,
                    setFocusSection,
                  )}
                  {data.content.definitionList &&
                    renderDefinitionList(
                      data.content.definitionList,
                      setFocusSection,
                    )}
                </li>
              ),
          )}
        </ol>
      </article>
    </div>
  );
};

export default GlossaryContent;
