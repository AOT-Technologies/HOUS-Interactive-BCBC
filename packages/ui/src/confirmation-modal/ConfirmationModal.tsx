"use client";

import {
  Dialog,
  Modal,
  ModalOverlay,
  Heading,
  DialogTrigger,
} from "react-aria-components";

import { TESTID_CONFIRMATION_MODAL } from "@repo/constants/src/testids";
import "./ConfirmationModal.css";
import Button from "../button/Button";

import "./ConfirmationModal.css";

export interface ConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  "data-testid"?: string;
}

export default function ConfirmationModal({
  onConfirm,
  onCancel,
  "data-testid": testid = TESTID_CONFIRMATION_MODAL,
}: ConfirmationModalProps) {
  return (
    <DialogTrigger isOpen>
      {/* Dummy button to prevent warning since dialog is triggered via browser event, not ui button*/}
      <Button style={{ display: "none" }}></Button>

      <ModalOverlay className="ui-ConfirmationModal--overlay">
        <Modal className="ui-ConfirmationModal--modal" data-testid={testid}>
          <Dialog className="ui-ConfirmationModal--dialog">
            {({ close }) => (
              <>
                <Heading className="ui-ConfirmationModal--title">
                  Are you sure you want to proceed?
                </Heading>

                <p className="ui-ConfirmationModal--content">
                  You will lose your progress if you continue.
                </p>
                <div className="ui-ConfirmationModal--actions">
                  <Button
                    type="button"
                    className="dialog-button"
                    variant="secondary"
                    aria-label="Cancel back navigation"
                    onPress={() => {
                      onCancel();
                      close();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="dialog-button"
                    variant="primary"
                    aria-label="Continue back navigation"
                    onPress={() => {
                      onConfirm();
                      close();
                    }}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
