import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

const SubmitConfirmModal = ({ open, onClose, onConfirm, isSubmitting }: Props) => (
  <AlertDialog open={open} onOpenChange={v => !v && onClose()}>
    <AlertDialogContent className="bg-[#0d0d1a] border-white/10 max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-white text-base">Submit Your Compliance Application?</AlertDialogTitle>
        <AlertDialogDescription className="text-white/50 text-xs">
          Your application and documents will be sent to the PayLoom Instants compliance team. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="text-xs bg-white/5 border-white/10 text-white/60 hover:bg-white/10" disabled={isSubmitting}>
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}
          className="bg-primary text-primary-foreground text-xs">
          {isSubmitting ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Submitting...</> : "Yes, Submit Application"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default SubmitConfirmModal;
