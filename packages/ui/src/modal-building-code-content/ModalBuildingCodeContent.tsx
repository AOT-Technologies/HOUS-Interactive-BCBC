"use client";

import React, { useRef } from "react";
import {
  ArticleType,
  ClauseType,
  PartType,
  SentenceType,
  SectionType,
  SubsectionType,
  ImageModalType,
  AllBuildingCodeNumberTypes,
  findBuildingCodeNumberTypeByReferenceNumber,
} from "@repo/data/useGlossaryData";
import { Heading } from "react-aria-components";
import {
  parseStringToComponents,
  stripReferencePrefix,
} from "web/utils/string";
import Image from "../image/Image";
import "./ModalBuildingCodeContent.css";
import Icon from "../icon/Icon";
import Button from "../button/Button";
import { useEffect, useState } from "react";

interface BuildingCodeContentProps {
  modalData?: PartType[];
  printData?: AllBuildingCodeNumberTypes;
  highlightedSection?: string | null;
  sectionRefs?: React.MutableRefObject<{ [key: string]: HTMLElement | null }>;
  setFocusSection?: (section: string) => void;
}

const BuildingCodeContent: React.FC<BuildingCodeContentProps> = ({
  modalData,
  printData,
  highlightedSection = null,
  sectionRefs = { current: {} },
  setFocusSection,
}) => {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const [printReference, setPrintReference] = useState<string | null>(null);

  useEffect(() => {
    if (printReference) {
      window.print();
    }
  }, [printReference]);

  useEffect(() => {
    if (highlightedSection && sectionRefs.current[highlightedSection]) {
      sectionRefs.current[highlightedSection]?.focus();
    }
    if (highlightedSection && liveRegionRef.current) {
      liveRegionRef.current.innerText = `Scroll or tab to navigate to new building code references.`;
    }
  }, [highlightedSection]);

  const handleDownload = (numberReference: string) => {
    if (printReference == numberReference) {
      window.print();
    } else {
      setPrintReference(numberReference);
    }
  };

  const renderSubClauses = (subClauses: string[]) => {
    return (
      <ol className="ui-ModalSide--Subclauses">
        {subClauses.map((subClause, index) => (
          <li key={index}>
            <span>{parseStringToComponents(subClause, setFocusSection)}</span>
          </li>
        ))}
      </ol>
    );
  };

  const renderClauses = (clauses: ClauseType[]) => {
    return (
      <ol className="ui-ModalSide--Clauses">
        {clauses.map((data, index) => (
          <li
            key={index}
            ref={(el) => {
              sectionRefs.current[data.numberReference] = el;
            }}
            className={`${
              highlightedSection === data.numberReference
                ? "ui-ModalSide--SectionHighlighted"
                : ""
            }`}
            tabIndex={-1}
          >
            <span>
              {parseStringToComponents(data.description, setFocusSection)}
            </span>
            {data.subClauses && renderSubClauses(data.subClauses)}
          </li>
        ))}
      </ol>
    );
  };

  const renderParts = (parts: PartType[]) => {
    return (
      (!!parts &&
        parts.map((data, index) => (
          <ol
            key={index}
            ref={(el) => {
              sectionRefs.current[data.numberReference] = el;
            }}
            className={`ui-ModalSide--Parts ${
              highlightedSection === data.numberReference
                ? "ui-ModalSide--SectionHighlighted"
                : ""
            }`}
            tabIndex={-1}
          >
            {/* Designs do not show this high level of headings. */}
            {data.sections && renderSections(data.sections)}
          </ol>
        ))) ??
      null
    );
  };

  const renderSections = (sections: SectionType[]) => {
    return (
      (!!sections &&
        sections.map((data, index) => (
          <li key={index}>
            {/* Designs do not show this high level of headings. */}
            <ol>{data.subsections && renderSubSections(data.subsections)}</ol>
          </li>
        ))) ??
      null
    );
  };

  const renderSubSections = (subSections: SubsectionType[]) => {
    return (
      (!!subSections &&
        subSections.map((data, index) => (
          <li
            key={index}
            ref={(el) => {
              sectionRefs.current[data.numberReference] = el;
            }}
            className={`ui-ModalSide--Subsection ${
              highlightedSection === data.numberReference
                ? "ui-ModalSide--SectionHighlighted"
                : ""
            }`}
            tabIndex={-1}
          >
            <Heading level={2} className="ui-ModalSide--SubsectionHeader">
              <span className="ui-ModalSide--SubsectionNumber">
                {stripReferencePrefix(data.numberReference)}{" "}
              </span>
              {data.title}
              {!printData && (
                <Button
                  variant="secondary"
                  onPress={() => handleDownload(data.numberReference)}
                  aria-label={`Download Building Code Subsection ${stripReferencePrefix(data.numberReference)} ${data.title}`}
                  className="ui-ModalSide-pdfButton"
                >
                  <Icon type="download" />
                  <span>PDF</span>
                </Button>
              )}
            </Heading>
            <ol>{data.articles && renderArticles(data.articles)}</ol>
          </li>
        ))) ??
      null
    );
  };

  const renderArticles = (articles: ArticleType[]) => {
    return (
      (!!articles &&
        articles.map((data, index) => (
          <li
            key={index}
            ref={(el) => {
              sectionRefs.current[data.numberReference] = el;
            }}
            className={`ui-ModalSide--Article ${
              highlightedSection === data.numberReference
                ? "ui-ModalSide--SectionHighlighted"
                : ""
            }`}
            tabIndex={-1}
          >
            <Heading className="ui-ModalSide--ArticleHeader">
              <span className="ui-ModalSide--ArticleNumber">
                {stripReferencePrefix(data.numberReference)}{" "}
              </span>
              {data.title}
            </Heading>
            <ol>{data.sentences && renderSentences(data.sentences)}</ol>
          </li>
        ))) ??
      null
    );
  };

  const renderSentences = (sentences: SentenceType[]) => {
    return (
      <li className="ui-ModalSide--ArticleContent">
        <ol className="ui-ModalSide--Sentences">
          {sentences.map((sentence, index) => (
            <li
              key={index}
              ref={(el) => {
                sectionRefs.current[sentence.numberReference] = el;
              }}
              className={`${
                highlightedSection === sentence.numberReference
                  ? "ui-ModalSide--SectionHighlighted"
                  : ""
              }`}
              tabIndex={-1}
            >
              {sentence.description && (
                <span>
                  {parseStringToComponents(
                    sentence.description,
                    setFocusSection,
                  )}
                </span>
              )}
              {sentence.clauses && renderClauses(sentence.clauses)}
              {sentence.image && renderTableImage(sentence.image)}
              {sentence.subDescription && (
                <span className="ui-ModalSide--SentenceSubDescription">
                  {parseStringToComponents(sentence.subDescription)}
                </span>
              )}
            </li>
          ))}
        </ol>
      </li>
    );
  };

  const renderTableImage = (image: ImageModalType) => {
    return (
      image && (
        <figure
          key={image.numberReference}
          ref={(el) => {
            sectionRefs.current[image.numberReference] = el;
          }}
          className={`ui-ModalSide--Image ui-ModalBuildingCodeContent--Figure ${
            highlightedSection === image.numberReference
              ? "ui-ModalSide--SectionHighlighted"
              : ""
          }`}
          tabIndex={-1}
          aria-labelledby={image.numberReference}
        >
          <figcaption id={image.numberReference}>
            <div className="ui-ModalBuildingCodeContent--FigureCaptionBold">
              {image.tableName}
              <br />
              {parseStringToComponents(image.title)}
            </div>
            <div className="ui-ModalBuildingCodeContent--FigureCaption">
              {parseStringToComponents(image.imageReference, setFocusSection)}
            </div>
          </figcaption>
          <Image
            src={image.fileName}
            alt={image.title}
            aria-label={image.imageLabel}
            width={800}
            height={600}
            loading="eager" // Will not lazy load images in Safari
            className="ui-ModalBuildingCodeContent-ImageResponsive"
            aria-hidden={image.imageTable ? "true" : "false"}
          />
          {image.imageTable && parseStringToComponents(image.imageTable)}
          {image.imageNotes && (
            <section className="ui-ModalBuildingCodeContent--TableImageNotes">
              <header className="ui-ModalBuildingCodeContent--FigureCaptionBold">
                Notes to {image.tableName}:
              </header>
              {parseStringToComponents(image.imageNotes, setFocusSection)}
            </section>
          )}
        </figure>
      )
    );
  };

  const renderBuildingCodePdf = () => {
    if (!printReference) return null;
    const data = findBuildingCodeNumberTypeByReferenceNumber(printReference);
    return (
      data &&
      "articles" in data && (
        <>
          <div className="ui-ModalBuildingCodeContent--printContainer">
            <h5 className="ui-ModalSide--SubsectionHeader">
              <span className="ui-ModalSide--SubsectionNumber">
                {stripReferencePrefix(data.numberReference)}{" "}
              </span>
              {data.title}
            </h5>
            <table className="ui-ModalBuildingCodeContent--modalTable">
              <tbody>
                <tr>
                  <td>{renderArticles(data.articles)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )
    );
  };

  // Render logic for printData
  const renderPrintData = () => {
    if (!printData) return null;
    if ("sentences" in printData) return renderSentences(printData.sentences);
    if ("articles" in printData) return renderArticles(printData.articles);
    if ("subsections" in printData)
      return renderSubSections(printData.subsections);
    if ("sections" in printData) return renderSections(printData.sections);
    return null;
  };

  return (
    <>
      <span
        ref={liveRegionRef}
        aria-live="assertive"
        className="ui-ModalSide--LiveRegion"
      ></span>
      {!printData && modalData && renderParts(modalData)}
      {printData && renderPrintData()}
      {printReference && renderBuildingCodePdf()}
    </>
  );
};

export default BuildingCodeContent;
