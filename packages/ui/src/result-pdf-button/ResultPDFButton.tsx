"use client";
// repo
import Icon from "@repo/ui/icon";
import { TESTID_RESULT_PDF_BUTTON } from "@repo/constants/src/testids";
// local
import Image from "../image/Image";
import "./ResultPDFButton.css";

export default function ResultPDFButton() {
  const handleDownload = () => {
    window.print();
  };

  return (
    <div
      aria-label="Download walkthrough questions, answers, and references as PDF"
      role="button"
      onClick={handleDownload}
      className="ui-ResultPDFButton--container"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleDownload();
      }}
      data-testid={TESTID_RESULT_PDF_BUTTON}
    >
      <div className="ui-ResultPDFButton--imageContainer">
        <Image
          src="result-preview.png"
          alt="Walkthrough Result Preview"
          aria-label="PDF download preview image"
          width={230}
          height={198}
          className="ui-ResultPDFButton--image"
        />
        <div className="ui-ResultPDFButton--imageMiddle">
          <Icon type="openInNew" />
        </div>
      </div>
      <div className="ui-ResultPDFButton--aside">
        <h3 className="ui-ResultPDFButton--title">
          Download results & references as PDF
        </h3>
        <div className="ui-ResultPDFButton--button ui-Button --primary">
          <Icon type="download" />
          <span>Download</span>
        </div>
      </div>
    </div>
  );
}
