"use client";
// 3rd party
import { toJS } from "mobx";
// repo
import {
  AllBuildingCodeNumberTypes,
  findBuildingCodeNumberTypeByReferenceNumber,
} from "@repo/data/useGlossaryData";
import {
  findSectionTitleByQuestionId,
  SectionData,
} from "@repo/data/useWalkthroughsData";
import {
  GET_TESTID_RESULT_PDF_RESULT_CONTENT,
  GET_TESTID_RESULT_PRINT_CONTENT_WALKTHROUGH,
  TESTID_RESULT_PRINT_CONTENT,
} from "@repo/constants/src/testids";
// local
import {
  useWalkthroughState,
  WalkthroughStoreGetPossibleAnswersFunctionType,
  WalkthroughStoreGetQuestionAsDisplayFunctionType,
} from "web/stores/WalkthroughRootStore";
import { parseStringToComponents } from "web/utils/string";
import { NavigationStoreQuestionHistoryItem } from "web/stores/NavigationStore";
import {
  AnswerStoreAnswerValueIsSelectedFunctionType,
  AnswerStoreGetAnswerValueFunctionType,
} from "web/stores/AnswerStore";
import { isNumber } from "web/utils/typeChecking";
import ResultContent from "web/components/result-content/ResultContent";
import BuildingCodeContent from "../modal-building-code-content/ModalBuildingCodeContent";
import "./ResultPDFPrintContent.css";

interface PrintQuestionData {
  questionId: string;
  questionText: string;
  answersToDisplay: {
    answerDisplayText: string;
    isSelectedAnswer: boolean;
  }[];
  codeReferenceNumber: string | null | undefined;
  codeReferenceDisplayText: string | null | undefined;
}

interface TablePrintQuestionData extends PrintQuestionData {
  codeReferenceNumberType: AllBuildingCodeNumberTypes | null;
  rowSpan: number;
}

interface PrintSectionData {
  sectionTitle: string | null;
  questions: TablePrintQuestionData[];
}

type QuestionDataByWalkthroughId = Record<string, PrintQuestionData[]>;
type PrintSectionDataBySectionTitle = Record<string, PrintSectionData>;

type PrintSectionDataBySectionTitleByWalkthroughId = Record<
  string,
  PrintSectionDataBySectionTitle
>;

const groupQuestionDataFromHistoryByWalkthroughId = (
  questionHistory: NavigationStoreQuestionHistoryItem[],
  getQuestionAsDisplayType: WalkthroughStoreGetQuestionAsDisplayFunctionType,
  getPossibleAnswers: WalkthroughStoreGetPossibleAnswersFunctionType,
  getAnswerValue: AnswerStoreGetAnswerValueFunctionType,
  answerValueIsSelected: AnswerStoreAnswerValueIsSelectedFunctionType,
): QuestionDataByWalkthroughId => {
  const questionDataByWalkthroughId: QuestionDataByWalkthroughId = {};
  questionHistory.forEach((historyItem) => {
    const question = getQuestionAsDisplayType(
      historyItem.walkthroughId,
      historyItem.questionId,
    );

    if (question) {
      let walkthroughQuestionData =
        questionDataByWalkthroughId[historyItem.walkthroughId];
      if (walkthroughQuestionData === undefined) {
        walkthroughQuestionData = [];
        questionDataByWalkthroughId[historyItem.walkthroughId] =
          walkthroughQuestionData;
      }

      let answersToDisplay = getPossibleAnswers(question).map((answer) => ({
        answerDisplayText:
          answer.answerValueDisplay || answer.answerDisplayText,
        isSelectedAnswer: answerValueIsSelected(
          getAnswerValue(historyItem.walkthroughId, historyItem.questionId),
          answer.answerValue,
        ),
      }));

      // cover numberFloat case, they don't have possible answers
      if (!answersToDisplay.length) {
        const answerValue = getAnswerValue(
          historyItem.walkthroughId,
          historyItem.questionId,
        );
        if (isNumber(answerValue)) {
          answersToDisplay = [
            {
              answerDisplayText: answerValue.toString(),
              isSelectedAnswer: true,
            },
          ];
        }
      }

      walkthroughQuestionData.push({
        questionId: historyItem.questionId,
        questionText: question.questionText,
        answersToDisplay: answersToDisplay,
        codeReferenceNumber: toJS(question.questionCodeReference?.codeNumber),
        codeReferenceDisplayText: toJS(
          question.questionCodeReference?.displayString,
        ),
      });
    }
  });

  return questionDataByWalkthroughId;
};

const groupQuestionsBySectionTitleAndWalkthroughId = (
  questionDataByWalkthroughId: QuestionDataByWalkthroughId,
  sectionsByWalkthroughId: Record<string, Record<string, SectionData>>,
): PrintSectionDataBySectionTitleByWalkthroughId => {
  const printSectionDataBySectionTitleByWalkthroughId: PrintSectionDataBySectionTitleByWalkthroughId =
    {};

  Object.entries(questionDataByWalkthroughId).forEach(
    ([walkthroughId, questions]) => {
      const printSectionDataBySectionTitle: PrintSectionDataBySectionTitle = {};

      questions.forEach((item) => {
        // get title and add new section if it doesn't exist
        const sectionTitle = findSectionTitleByQuestionId(
          item.questionId,
          sectionsByWalkthroughId[walkthroughId] || {},
        );
        if (!sectionTitle) return;
        let printSectionData = printSectionDataBySectionTitle[sectionTitle];
        if (printSectionData === undefined) {
          printSectionData = { sectionTitle, questions: [] };
          printSectionDataBySectionTitle[sectionTitle] = printSectionData;
        }

        printSectionData.questions.push({
          ...item,
          rowSpan: 1,
          codeReferenceNumberType: item.codeReferenceNumber
            ? findBuildingCodeNumberTypeByReferenceNumber(
                item.codeReferenceNumber,
              )
            : null,
        });
      });

      Object.values(printSectionDataBySectionTitle).forEach(
        (groupedQuestions) => {
          groupedQuestions.questions.forEach((question, index) => {
            if (question.rowSpan === 0) return;

            // find number of questions after that have the same building code section
            let rowSpan = 1;
            for (
              let i = index + 1;
              i < groupedQuestions.questions.length;
              i++
            ) {
              const questionToCheck = groupedQuestions.questions[i];
              if (!questionToCheck) break;

              if (
                question.codeReferenceNumberType ===
                questionToCheck.codeReferenceNumberType
              ) {
                rowSpan++;

                // set rowSpan to 0 for the question that was checked so it doesn't render this cell
                questionToCheck.rowSpan = 0;
              } else {
                break;
              }
            }

            // add rowSpan to the question
            question.rowSpan = rowSpan;
          });
        },
      );

      printSectionDataBySectionTitleByWalkthroughId[walkthroughId] =
        printSectionDataBySectionTitle;
    },
  );

  return printSectionDataBySectionTitleByWalkthroughId;
};

const renderQuestionsAnswersAndCodeReferenceNumbers = (
  printSectionData: PrintSectionData,
  sectionIndex: number,
) => {
  return printSectionData.questions.map((questionData, questionIndex) => {
    const parsedQuestion = parseStringToComponents(
      questionData.questionText,
      undefined,
      true,
    );

    return (
      <tr key={`${sectionIndex}-${questionIndex}`}>
        <td className="ui-ResultPDFPrintContent--answerColumn">
          {parsedQuestion}
          <br />
          <ul>
            {questionData.answersToDisplay.map(
              ({ answerDisplayText, isSelectedAnswer }, i) => (
                <li
                  key={i}
                  className={`${isSelectedAnswer ? "ui-ResultPDFPrintContent--selectedAnswer" : ""}`}
                >
                  {parseStringToComponents(answerDisplayText, undefined, true)}
                </li>
              ),
            )}
          </ul>
        </td>
        {questionData.rowSpan !== 0 && (
          <td
            className="ui-ResultPDFPrintContent--referenceColumn"
            rowSpan={questionData.rowSpan}
          >
            {questionData.codeReferenceDisplayText}
          </td>
        )}
      </tr>
    );
  });
};

const renderBuildingCodeContent = (printSectionData: PrintSectionData) => {
  return printSectionData.questions.map((questionData, questionIndex) => {
    return (
      <tr key={`${printSectionData.sectionTitle}-${questionIndex}`}>
        {questionIndex === 0 && (
          <td>
            <BuildingCodeContent
              printData={questionData.codeReferenceNumberType ?? undefined}
            />
          </td>
        )}
      </tr>
    );
  });
};

const groupHasABuildingCodeSection = (group: PrintSectionData) => {
  return group.questions.some(
    (question) => question.codeReferenceNumberType !== null,
  );
};

export default function ResultPDFPrintContent() {
  const {
    navigationStore,
    walkthroughsOrder,
    walkthroughsById,
    getAllSectionsByWalkthroughId,
    getQuestionAsDisplayType,
    getPossibleAnswers,
    answerStore: { getAnswerValue, answerValueIsSelected },
  } = useWalkthroughState();

  // Get the question data from the question history for the PDF
  const questionDataByWalkthroughId =
    groupQuestionDataFromHistoryByWalkthroughId(
      navigationStore.questionHistory,
      getQuestionAsDisplayType,
      getPossibleAnswers,
      getAnswerValue,
      answerValueIsSelected,
    );

  const questionDataBySectionTitleAndWalkthroughId =
    groupQuestionsBySectionTitleAndWalkthroughId(
      questionDataByWalkthroughId,
      getAllSectionsByWalkthroughId(),
    );

  return (
    <div
      className="ui-ResultPDFPrintContent--printContainer"
      data-testid={TESTID_RESULT_PRINT_CONTENT}
    >
      {walkthroughsOrder.map((walkthroughId) => {
        const printSectionDataBySectionTitle =
          questionDataBySectionTitleAndWalkthroughId[walkthroughId];
        if (!printSectionDataBySectionTitle) return null;

        return (
          <div
            key={`print-walkthrough-${walkthroughId}`}
            data-testid={GET_TESTID_RESULT_PRINT_CONTENT_WALKTHROUGH(
              walkthroughId,
            )}
          >
            <h3 className="ui-ResultPDFPrintContent--walkthroughTitle">
              {walkthroughsById[walkthroughId]?.info.walkthroughTitle}
            </h3>
            <ResultContent
              walkthroughId={walkthroughId}
              data-testid={GET_TESTID_RESULT_PDF_RESULT_CONTENT(walkthroughId)}
            />
            {Object.entries(printSectionDataBySectionTitle).map(
              ([, printSectionData], sectionIndex) => (
                <table
                  className="ui-ResultPDFPrintContent--table"
                  key={sectionIndex}
                >
                  <thead>
                    <tr>
                      <th colSpan={2}>
                        <h4 className="ui-ResultPDFPrintContent--sectionTitle">
                          {printSectionData.sectionTitle}
                        </h4>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderQuestionsAnswersAndCodeReferenceNumbers(
                      printSectionData,
                      sectionIndex,
                    )}
                  </tbody>
                </table>
              ),
            )}
            {Object.entries(printSectionDataBySectionTitle).map(
              ([, printSectionData], sectionIndex) =>
                groupHasABuildingCodeSection(printSectionData) && (
                  <table
                    className="ui-ResultPDFPrintContent--table"
                    key={sectionIndex}
                  >
                    <thead>
                      <tr>
                        <th>
                          <h4 className="ui-ResultPDFPrintContent--sectionTitle">
                            {printSectionData.sectionTitle}
                          </h4>
                        </th>
                      </tr>
                    </thead>
                    <tbody>{renderBuildingCodeContent(printSectionData)}</tbody>
                  </table>
                ),
            )}
            <span className="ui-ResultPDFPrintContent--spacer"></span>
          </div>
        );
      })}
    </div>
  );
}
