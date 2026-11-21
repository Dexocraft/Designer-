import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { AdSlot } from './components/AdSlot';
import { CardCanvasStage } from './components/CardCanvasStage';
import { ConfirmDialog } from './components/ConfirmDialog';
import { LeftTabId, LeftToolPanel } from './components/LeftToolPanel';
import { ReviewApproveModal } from './components/ReviewApproveModal';
import { AlignAction, LayerAction, RightInspector } from './components/RightInspector';
import { ToastBanner } from './components/ToastBanner';
import { TopBar } from './components/TopBar';
import {
  CardTemplate,
  createBlankProject,
  createId,
  createStarterProject,
  createTextElement,
  remapSideForOrientation,
} from './data/templates';
import {
  CardBackground,
  CardElement,
  CardOrientation,
  CardProject,
  CardSideId,
  CardSidedness,
  ImageElement,
  SavedDraft,
  TextFieldType,
  ToastMessage,
  UploadedAsset,
  getCanvasMetrics,
} from './types/card';
import {
  SubmittedCardHistoryItem,
  loadSubmittedCardHistory,
  recordSubmittedCardLocally,
  saveCardOrderToDatabase,
} from './utils/cardDatabase';
import {
  exportProjectJsonBackup,
  parseProjectJsonBackup,
  renderSideToPngDataUrl,
} from './utils/exportRenderer';
import {
  clearActiveProject,
  loadActiveProject,
  loadSavedDrafts,
  persistSavedDrafts,
  processUploadedImageFile,
  saveActiveProject,
} from './utils/storage';

const MAX_HISTORY = 40;

type PendingConfirm =
  | { kind: 'reset-starter' }
  | { kind: 'start-blank' }
  | { kind: 'apply-template'; template: CardTemplate }
  | { kind: 'delete-draft'; draftId: string; draftName: string }
  | null;

export default function App() {
  const [project, setProject] = useState<CardProject>(() => {
    return loadActiveProject() ?? createStarterProject();
  });
  const [activeSide, setActiveSide] = useState<CardSideId>('front');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTabId>('add');
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>(() => loadSavedDrafts());
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'tools' | 'inspector'>('none');
  const [submittedCards, setSubmittedCards] = useState<SubmittedCardHistoryItem[]>(() =>
    loadSubmittedCardHistory()
  );

  // Undo / Redo stacks storing deep snapshots of CardProject
  const [pastHistory, setPastHistory] = useState<CardProject[]>([]);
  const [futureHistory, setFutureHistory] = useState<CardProject[]>([]);
  const dragOriginProjectRef = useRef<CardProject | null>(null);
  const projectRef = useRef<CardProject>(project);
  projectRef.current = project;

  const notify = useCallback(
    (type: ToastMessage['type'], message: string) => {
      const id = createId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persist active project to localStorage on change
  useEffect(() => {
    saveActiveProject(project);
  }, [project]);

  const pushHistorySnapshot = useCallback((snapshot: CardProject) => {
    setPastHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), snapshot]);
    setFutureHistory([]);
  }, []);

  const applyProjectChange = useCallback(
    (
      updater: (prev: CardProject) => CardProject,
      options: { recordHistory?: boolean; invalidateAcceptance?: boolean } = {}
    ) => {
      const { recordHistory = true, invalidateAcceptance = true } = options;
      setProject((prev) => {
        if (recordHistory) {
          pushHistorySnapshot(prev);
        }
        const next = updater(prev);
        return {
          ...next,
          updatedAt: new Date().toISOString(),
          accepted: invalidateAcceptance ? false : next.accepted,
        };
      });
    },
    [pushHistorySnapshot]
  );

  const handleUndo = useCallback(() => {
    setPastHistory((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const current = projectRef.current;
      setFutureHistory((prevFuture) => [current, ...prevFuture.slice(0, MAX_HISTORY - 1)]);
      setProject(previous);
      setSelectedId(null);
      if (previous.sidedness === 'single') {
        setActiveSide('front');
      }
      return prevPast.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFutureHistory((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const current = projectRef.current;
      setPastHistory((prevPast) => [...prevPast.slice(-(MAX_HISTORY - 1)), current]);
      setProject(next);
      setSelectedId(null);
      if (next.sidedness === 'single') {
        setActiveSide('front');
      }
      return prevFuture.slice(1);
    });
  }, []);

  const handleSelectSide = useCallback((side: CardSideId) => {
    setActiveSide(side);
    setSelectedId(null);
  }, []);

  const handleRenameProject = useCallback(
    (name: string) => {
      applyProjectChange((prev) => ({ ...prev, name }), {
        recordHistory: false,
        invalidateAcceptance: false,
      });
    },
    [applyProjectChange]
  );

  const handleChangeSidedness = useCallback(
    (sidedness: CardSidedness) => {
      if (sidedness === projectRef.current.sidedness) return;
      applyProjectChange((prev) => ({ ...prev, sidedness }));
      if (sidedness === 'single') {
        setActiveSide('front');
        setSelectedId(null);
      }
      notify(
        'info',
        sidedness === 'double'
          ? 'Switched to 2-sided card (Front & Back).'
          : 'Switched to 1-sided card (Front only).'
      );
    },
    [applyProjectChange, notify]
  );

  const handleChangeOrientation = useCallback(
    (orientation: CardOrientation) => {
      if (orientation === projectRef.current.orientation) return;
      applyProjectChange((prev) => ({
        ...prev,
        orientation,
        front: remapSideForOrientation(prev.front, prev.orientation, orientation),
        back: remapSideForOrientation(prev.back, prev.orientation, orientation),
      }));
      notify(
        'info',
        orientation === 'horizontal'
          ? 'Switched to Horizontal 3.5" × 2.0" layout.'
          : 'Switched to Vertical 2.0" × 3.5" layout.'
      );
    },
    [applyProjectChange, notify]
  );

  const handleToggleGuide = useCallback(
    (guide: 'showBleed' | 'showTrim' | 'showSafeZone') => {
      applyProjectChange(
        (prev) => ({
          ...prev,
          guides: {
            ...prev.guides,
            [guide]: !prev.guides[guide],
          },
        }),
        { recordHistory: false, invalidateAcceptance: false }
      );
    },
    [applyProjectChange]
  );

  const handleAddTextField = useCallback(
    (fieldType: TextFieldType) => {
      const current = projectRef.current;
      const sideBg = current[activeSide].background;
      const isDarkBg =
        sideBg.type === 'solid'
          ? isHexDark(sideBg.color)
          : isHexDark(sideBg.gradientStart);

      const newEl = createTextElement(fieldType, current.orientation, {
        color: isDarkBg ? '#F8FAFC' : '#0F172A',
      });

      applyProjectChange((prev) => ({
        ...prev,
        [activeSide]: {
          ...prev[activeSide],
          elements: [...prev[activeSide].elements, newEl],
        },
      }));
      setSelectedId(newEl.id);
      setMobileDrawer('none');
    },
    [activeSide, applyProjectChange]
  );

  const placeAssetOnCanvas = useCallback(
    (asset: UploadedAsset) => {
      const current = projectRef.current;
      const metrics = getCanvasMetrics(current.orientation);
      const maxInitialW = Math.round(metrics.safeW * 0.36);
      const ratio = asset.naturalHeight / Math.max(1, asset.naturalWidth);
      let w = Math.min(asset.naturalWidth, maxInitialW);
      let h = Math.round(w * ratio);
      if (h > metrics.safeH * 0.55) {
        h = Math.round(metrics.safeH * 0.55);
        w = Math.round(h / Math.max(0.05, ratio));
      }
      w = Math.max(40, w);
      h = Math.max(40, h);

      const newImg: ImageElement = {
        id: createId('img'),
        type: 'image',
        src: asset.src,
        fileName: asset.fileName,
        naturalWidth: asset.naturalWidth,
        naturalHeight: asset.naturalHeight,
        preserveAspect: true,
        x: Math.round((metrics.fullW - w) / 2),
        y: Math.round((metrics.fullH - h) / 2),
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
      };

      applyProjectChange((prev) => ({
        ...prev,
        [activeSide]: {
          ...prev[activeSide],
          elements: [...prev[activeSide].elements, newImg],
        },
      }));
      setSelectedId(newImg.id);
      setMobileDrawer('none');
    },
    [activeSide, applyProjectChange]
  );

  const handleAddQrCode = useCallback(
    (src: string, label: string) => {
      const current = projectRef.current;
      const metrics = getCanvasMetrics(current.orientation);
      const size = Math.round(Math.min(metrics.safeW, metrics.safeH) * 0.34);

      const qrElement: ImageElement = {
        id: createId('img'),
        type: 'image',
        src,
        fileName: label,
        naturalWidth: 600,
        naturalHeight: 600,
        preserveAspect: true,
        x: Math.round((metrics.fullW - size) / 2),
        y: Math.round((metrics.fullH - size) / 2),
        width: size,
        height: size,
        rotation: 0,
        opacity: 1,
      };

      applyProjectChange((prev) => ({
        ...prev,
        [activeSide]: {
          ...prev[activeSide],
          elements: [...prev[activeSide].elements, qrElement],
        },
      }));
      setSelectedId(qrElement.id);
      setMobileDrawer('none');
      notify('success', `Placed QR code on ${activeSide} side.`);
    },
    [activeSide, applyProjectChange, notify]
  );

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        try {
          const processed = await processUploadedImageFile(file);
          const asset: UploadedAsset = {
            id: createId('asset'),
            fileName: processed.fileName,
            src: processed.src,
            naturalWidth: processed.naturalWidth,
            naturalHeight: processed.naturalHeight,
            addedAt: new Date().toISOString(),
          };
          setUploadedAssets((prev) => [asset, ...prev]);
          placeAssetOnCanvas(asset);
          notify('success', `Added "${processed.fileName}" to ${activeSide} side.`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Image upload failed.';
          notify('error', msg);
        }
      }
    },
    [activeSide, notify, placeAssetOnCanvas]
  );

  const handleUpdateElement = useCallback(
    (id: string, patch: Partial<CardElement>, recordHistory = false) => {
      if (!recordHistory && !dragOriginProjectRef.current) {
        dragOriginProjectRef.current = projectRef.current;
      }

      applyProjectChange(
        (prev) => ({
          ...prev,
          [activeSide]: {
            ...prev[activeSide],
            elements: prev[activeSide].elements.map((el) =>
              el.id === id ? ({ ...el, ...patch } as CardElement) : el
            ),
          },
        }),
        { recordHistory, invalidateAcceptance: true }
      );
    },
    [activeSide, applyProjectChange]
  );

  const handleCommitElementHistory = useCallback(() => {
    if (dragOriginProjectRef.current) {
      pushHistorySnapshot(dragOriginProjectRef.current);
      dragOriginProjectRef.current = null;
    }
  }, [pushHistorySnapshot]);

  const handleDuplicateElement = useCallback(
    (id: string) => {
      const side = projectRef.current[activeSide];
      const source = side.elements.find((el) => el.id === id);
      if (!source) return;
      const clone: CardElement = {
        ...source,
        id: createId(source.type === 'text' ? 'txt' : 'img'),
        x: source.x + 28,
        y: source.y + 28,
        locked: false,
      };
      applyProjectChange((prev) => ({
        ...prev,
        [activeSide]: {
          ...prev[activeSide],
          elements: [...prev[activeSide].elements, clone],
        },
      }));
      setSelectedId(clone.id);
    },
    [activeSide, applyProjectChange]
  );

  const handleDeleteElement = useCallback(
    (id: string) => {
      applyProjectChange((prev) => ({
        ...prev,
        [activeSide]: {
          ...prev[activeSide],
          elements: prev[activeSide].elements.filter((el) => el.id !== id),
        },
      }));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [activeSide, applyProjectChange]
  );

  const handleAlignElement = useCallback(
    (id: string, action: AlignAction) => {
      const current = projectRef.current;
      const el = current[activeSide].elements.find((item) => item.id === id);
      if (!el || el.locked) return;
      const m = getCanvasMetrics(current.orientation);
      const safeLeft = m.safeInsetFromEdgePx;
      const safeTop = m.safeInsetFromEdgePx;
      const safeRight = m.fullW - m.safeInsetFromEdgePx;
      const safeBottom = m.fullH - m.safeInsetFromEdgePx;

      let patch: Partial<CardElement> = {};
      if (action === 'left') patch = { x: Math.round(safeLeft) };
      if (action === 'center-h') patch = { x: Math.round((m.fullW - el.width) / 2) };
      if (action === 'right') patch = { x: Math.round(safeRight - el.width) };
      if (action === 'top') patch = { y: Math.round(safeTop) };
      if (action === 'center-v') patch = { y: Math.round((m.fullH - el.height) / 2) };
      if (action === 'bottom') patch = { y: Math.round(safeBottom - el.height) };

      handleUpdateElement(id, patch, true);
    },
    [activeSide, handleUpdateElement]
  );

  const handleReorderLayer = useCallback(
    (id: string, action: LayerAction) => {
      applyProjectChange((prev) => {
        const list = [...prev[activeSide].elements];
        const idx = list.findIndex((el) => el.id === id);
        if (idx === -1) return prev;
        const [item] = list.splice(idx, 1);
        if (action === 'forward') list.splice(Math.min(list.length, idx + 1), 0, item);
        if (action === 'backward') list.splice(Math.max(0, idx - 1), 0, item);
        if (action === 'front') list.push(item);
        if (action === 'back') list.unshift(item);
        return {
          ...prev,
          [activeSide]: {
            ...prev[activeSide],
            elements: list,
          },
        };
      });
    },
    [activeSide, applyProjectChange]
  );

  const handleFitImageSafeZone = useCallback(
    (id: string) => {
      const current = projectRef.current;
      const el = current[activeSide].elements.find((item) => item.id === id);
      if (!el || el.type !== 'image' || el.locked) return;
      const m = getCanvasMetrics(current.orientation);
      const ratio = el.naturalHeight / Math.max(1, el.naturalWidth);
      let w = m.safeW;
      let h = Math.round(w * ratio);
      if (h > m.safeH) {
        h = m.safeH;
        w = Math.round(h / Math.max(0.05, ratio));
      }
      handleUpdateElement(
        id,
        {
          x: Math.round((m.fullW - w) / 2),
          y: Math.round((m.fullH - h) / 2),
          width: w,
          height: h,
        },
        true
      );
    },
    [activeSide, handleUpdateElement]
  );

  const handleUpdateBackground = useCallback(
    (bg: CardBackground) => {
      applyProjectChange((prev) => ({
        ...prev,
        [activeSide]: {
          ...prev[activeSide],
          background: bg,
        },
      }));
    },
    [activeSide, applyProjectChange]
  );

  const handleApplyBackgroundToBothSides = useCallback(() => {
    applyProjectChange((prev) => ({
      ...prev,
      front: { ...prev.front, background: { ...prev[activeSide].background } },
      back: { ...prev.back, background: { ...prev[activeSide].background } },
    }));
    notify('success', 'Applied background fill to both Front and Back.');
  }, [activeSide, applyProjectChange, notify]);

  const handleSaveDraft = useCallback(
    async (customName?: string) => {
      const current = projectRef.current;
      const draftName = customName || current.name || 'Untitled Business Card';
      try {
        const frontPreviewDataUrl = await renderSideToPngDataUrl(
          current.front,
          current.orientation,
          0.32
        );
        const backPreviewDataUrl =
          current.sidedness === 'double'
            ? await renderSideToPngDataUrl(current.back, current.orientation, 0.32)
            : undefined;

        const draft: SavedDraft = {
          id: createId('draft'),
          name: draftName,
          savedAt: new Date().toISOString(),
          sidedness: current.sidedness,
          orientation: current.orientation,
          frontPreviewDataUrl,
          backPreviewDataUrl,
          project: {
            ...current,
            name: draftName,
            updatedAt: new Date().toISOString(),
          },
        };

        const nextDrafts = [draft, ...savedDrafts].slice(0, 15);
        const ok = persistSavedDrafts(nextDrafts);
        if (!ok) {
          notify(
            'warning',
            'Browser storage limit reached. Delete an older draft or export a JSON backup.'
          );
          return;
        }
        setSavedDrafts(nextDrafts);
        notify('success', `Saved "${draftName}" to browser drafts.`);
      } catch {
        notify('error', 'Could not generate preview thumbnail for draft.');
      }
    },
    [notify, savedDrafts]
  );

  const handleLoadDraft = useCallback(
    (draft: SavedDraft) => {
      pushHistorySnapshot(projectRef.current);
      setProject({
        ...draft.project,
        updatedAt: new Date().toISOString(),
      });
      setActiveSide('front');
      setSelectedId(null);
      setMobileDrawer('none');
      notify('success', `Loaded draft "${draft.name}".`);
    },
    [notify, pushHistorySnapshot]
  );

  const executePendingConfirm = useCallback(() => {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === 'apply-template') {
      const next = pendingConfirm.template.build();
      pushHistorySnapshot(projectRef.current);
      setProject(next);
      setActiveSide('front');
      setSelectedId(null);
      setMobileDrawer('none');
      notify('success', `Applied "${pendingConfirm.template.name}" template.`);
    } else if (pendingConfirm.kind === 'start-blank') {
      const next = createBlankProject(projectRef.current.orientation);
      pushHistorySnapshot(projectRef.current);
      setProject(next);
      setActiveSide('front');
      setSelectedId(null);
      setMobileDrawer('none');
      notify('info', 'Started a clean blank card.');
    } else if (pendingConfirm.kind === 'reset-starter') {
      clearActiveProject();
      const next = createStarterProject();
      pushHistorySnapshot(projectRef.current);
      setProject(next);
      setActiveSide('front');
      setSelectedId(null);
      setMobileDrawer('none');
      notify('info', 'Workspace reset to starter card.');
    } else if (pendingConfirm.kind === 'delete-draft') {
      const nextDrafts = savedDrafts.filter((d) => d.id !== pendingConfirm.draftId);
      persistSavedDrafts(nextDrafts);
      setSavedDrafts(nextDrafts);
      notify('info', `Deleted draft "${pendingConfirm.draftName}".`);
    }
    setPendingConfirm(null);
  }, [notify, pendingConfirm, pushHistorySnapshot, savedDrafts]);

  const handleImportJsonFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const imported = parseProjectJsonBackup(text);
        pushHistorySnapshot(projectRef.current);
        setProject(imported);
        setActiveSide('front');
        setSelectedId(null);
        notify('success', `Restored "${imported.name}" from JSON backup.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid JSON backup file.';
        notify('error', msg);
      }
    },
    [notify, pushHistorySnapshot]
  );

  const handleAcceptDesign = useCallback(() => {
    applyProjectChange((prev) => ({ ...prev, accepted: true }), {
      recordHistory: false,
      invalidateAcceptance: false,
    });
    notify('success', 'Design accepted! Print-ready downloads are now unlocked.');
  }, [applyProjectChange, notify]);

  const handleGetCards = useCallback(
    async (email: string): Promise<{ cardId: string } | null> => {
      try {
        const current = projectRef.current;
        const saved = await saveCardOrderToDatabase(current, email);
        const acceptedProject: CardProject = {
          ...current,
          accepted: true,
          updatedAt: new Date().toISOString(),
        };
        applyProjectChange((prev) => ({ ...prev, accepted: true }), {
          recordHistory: false,
          invalidateAcceptance: false,
        });
        const nextHistory = recordSubmittedCardLocally({
          id: saved.cardId,
          email: saved.email,
          name: current.name,
          submittedAt: new Date().toISOString(),
          sidedness: current.sidedness,
          orientation: current.orientation,
          project: acceptedProject,
        });
        setSubmittedCards(nextHistory);
        notify('success', `Saved "${current.name}" to database. Opening TapCard store...`);
        return { cardId: saved.cardId };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save card to database.';
        notify('error', msg);
        return null;
      }
    },
    [applyProjectChange, notify]
  );

  const handleLoadSubmittedCard = useCallback(
    (item: SubmittedCardHistoryItem) => {
      pushHistorySnapshot(projectRef.current);
      setProject({
        ...item.project,
        updatedAt: new Date().toISOString(),
      });
      setActiveSide('front');
      setSelectedId(null);
      setMobileDrawer('none');
      notify('success', `Loaded submitted card "${item.name}".`);
    },
    [notify, pushHistorySnapshot]
  );

  // Keyboard shortcuts: Undo/Redo, Delete, Arrow nudge
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (isTyping) return;
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        if (isTyping) return;
        e.preventDefault();
        handleRedo();
        return;
      }

      if (isTyping || !selectedId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteElement(selectedId);
        return;
      }

      const step = e.shiftKey ? 15 : 3;
      const el = projectRef.current[activeSide].elements.find((item) => item.id === selectedId);
      if (!el || el.locked) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleUpdateElement(selectedId, { x: el.x - step }, true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleUpdateElement(selectedId, { x: el.x + step }, true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleUpdateElement(selectedId, { y: el.y - step }, true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleUpdateElement(selectedId, { y: el.y + step }, true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSide, handleDeleteElement, handleRedo, handleUndo, handleUpdateElement, selectedId]);

  const activeElements = project[activeSide].elements;
  const selectedElement = activeElements.find((el) => el.id === selectedId) ?? null;

  const confirmDialogConfig = (() => {
    if (!pendingConfirm) return null;
    if (pendingConfirm.kind === 'apply-template') {
      return {
        title: `Load "${pendingConfirm.template.name}"?`,
        description:
          'Switching templates replaces the current Front and Back card layout. You can still Undo or save a draft first.',
        confirmLabel: 'Apply Template',
        destructive: false,
      };
    }
    if (pendingConfirm.kind === 'start-blank') {
      return {
        title: 'Start a blank card?',
        description:
          'This clears all elements on both sides so you can build from scratch. You can undo anytime.',
        confirmLabel: 'Start Blank',
        destructive: false,
      };
    }
    if (pendingConfirm.kind === 'reset-starter') {
      return {
        title: 'Reset workspace to starter card?',
        description:
          'This restores the default starter card and clears the active workspace session. Saved drafts are kept.',
        confirmLabel: 'Reset Workspace',
        destructive: true,
      };
    }
    return {
      title: `Delete "${pendingConfirm.draftName}"?`,
      description: 'This removes the saved draft permanently from browser localStorage.',
      confirmLabel: 'Delete Draft',
      destructive: true,
    };
  })();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#ECEFF3] text-slate-900">
      <TopBar
        activeLeftTab={activeLeftTab}
        onSelectTab={(tab) => {
          setActiveLeftTab(tab);
          if (window.innerWidth < 1024) {
            setMobileDrawer('tools');
          }
        }}
        onOpenReview={() => setReviewOpen(true)}
      />

      {/* Top Leaderboard Ad Strip */}
      <AdSlot variant="leaderboard" initialIndex={0} />

      {/* Main Three-Pane Studio Workspace */}
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Left Rail */}
        <div className="hidden h-full lg:flex">
          <LeftToolPanel
            activeTab={activeLeftTab}
            onTabChange={setActiveLeftTab}
            project={project}
            activeSide={activeSide}
            onRenameProject={handleRenameProject}
            onAddTextField={handleAddTextField}
            onAddQrCode={handleAddQrCode}
            onUploadFiles={handleUploadFiles}
            uploadedAssets={uploadedAssets}
            onPlaceUploadedAsset={placeAssetOnCanvas}
            onApplyTemplate={(template) =>
              setPendingConfirm({ kind: 'apply-template', template })
            }
            onStartBlank={() => setPendingConfirm({ kind: 'start-blank' })}
            onUpdateBackground={handleUpdateBackground}
            onApplyBackgroundToBothSides={handleApplyBackgroundToBothSides}
            savedDrafts={savedDrafts}
            onSaveDraft={handleSaveDraft}
            onLoadDraft={handleLoadDraft}
            onDeleteDraft={(draftId) => {
              const found = savedDrafts.find((d) => d.id === draftId);
              setPendingConfirm({
                kind: 'delete-draft',
                draftId,
                draftName: found?.name || 'Draft',
              });
            }}
            onExportJson={() => {
              exportProjectJsonBackup(project);
              notify('success', 'Downloaded JSON design backup.');
            }}
            onImportJsonFile={handleImportJsonFile}
            onResetToStarter={() => setPendingConfirm({ kind: 'reset-starter' })}
            submittedCards={submittedCards}
            onLoadSubmittedCard={handleLoadSubmittedCard}
          />
        </div>

        {/* Center Interactive Print Stage */}
        <CardCanvasStage
          project={project}
          activeSide={activeSide}
          selectedId={selectedId}
          canUndo={pastHistory.length > 0}
          canRedo={futureHistory.length > 0}
          onSelectSide={handleSelectSide}
          onSelectElement={setSelectedId}
          onUpdateElement={handleUpdateElement}
          onCommitElementHistory={handleCommitElementHistory}
          onChangeSidedness={handleChangeSidedness}
          onChangeOrientation={handleChangeOrientation}
          onToggleGuide={handleToggleGuide}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onQuickSaveDraft={() => handleSaveDraft()}
          onOpenMobileTools={() => setMobileDrawer('tools')}
          onOpenMobileInspector={() => setMobileDrawer('inspector')}
        />

        {/* Desktop Right Inspector */}
        <div className="hidden h-full lg:flex">
          <RightInspector
            selectedElement={selectedElement}
            elements={activeElements}
            orientation={project.orientation}
            activeSide={activeSide}
            onSelectElement={setSelectedId}
            onUpdateElement={handleUpdateElement}
            onDuplicateElement={handleDuplicateElement}
            onDeleteElement={handleDeleteElement}
            onAlignElement={handleAlignElement}
            onReorderLayer={handleReorderLayer}
            onFitImageSafeZone={handleFitImageSafeZone}
          />
        </div>

        {/* Responsive Mobile / Tablet / Narrow Iframe Drawer */}
        {mobileDrawer !== 'none' && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              onClick={() => setMobileDrawer('none')}
              className="fixed inset-0 bg-slate-900/40"
            />
            <div
              className={`relative z-50 flex h-full w-full max-w-xs flex-col bg-white shadow-2xl ${
                mobileDrawer === 'inspector' ? 'ml-auto' : ''
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                <span className="font-display text-sm font-semibold text-slate-900">
                  {mobileDrawer === 'tools' ? 'Design Tools' : 'Element Inspector'}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileDrawer('none')}
                  aria-label="Close panel"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                {mobileDrawer === 'tools' ? (
                  <LeftToolPanel
                    activeTab={activeLeftTab}
                    onTabChange={setActiveLeftTab}
                    project={project}
                    activeSide={activeSide}
                    onRenameProject={handleRenameProject}
                    onAddTextField={handleAddTextField}
                    onAddQrCode={handleAddQrCode}
                    onUploadFiles={handleUploadFiles}
                    uploadedAssets={uploadedAssets}
                    onPlaceUploadedAsset={placeAssetOnCanvas}
                    onApplyTemplate={(template) =>
                      setPendingConfirm({ kind: 'apply-template', template })
                    }
                    onStartBlank={() => setPendingConfirm({ kind: 'start-blank' })}
                    onUpdateBackground={handleUpdateBackground}
                    onApplyBackgroundToBothSides={handleApplyBackgroundToBothSides}
                    savedDrafts={savedDrafts}
                    onSaveDraft={handleSaveDraft}
                    onLoadDraft={handleLoadDraft}
                    onDeleteDraft={(draftId) => {
                      const found = savedDrafts.find((d) => d.id === draftId);
                      setPendingConfirm({
                        kind: 'delete-draft',
                        draftId,
                        draftName: found?.name || 'Draft',
                      });
                    }}
                    onExportJson={() => {
                      exportProjectJsonBackup(project);
                      notify('success', 'Downloaded JSON design backup.');
                    }}
                    onImportJsonFile={handleImportJsonFile}
                    onResetToStarter={() => setPendingConfirm({ kind: 'reset-starter' })}
                    submittedCards={submittedCards}
                    onLoadSubmittedCard={handleLoadSubmittedCard}
                  />
                ) : (
                  <RightInspector
                    selectedElement={selectedElement}
                    elements={activeElements}
                    orientation={project.orientation}
                    activeSide={activeSide}
                    onSelectElement={setSelectedId}
                    onUpdateElement={handleUpdateElement}
                    onDuplicateElement={handleDuplicateElement}
                    onDeleteElement={handleDeleteElement}
                    onAlignElement={handleAlignElement}
                    onReorderLayer={handleReorderLayer}
                    onFitImageSafeZone={handleFitImageSafeZone}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Workspace Ad Strip */}
      <AdSlot variant="footer" initialIndex={3} />

      <ReviewApproveModal
        open={reviewOpen}
        project={project}
        onClose={() => setReviewOpen(false)}
        onAcceptDesign={handleAcceptDesign}
        onSaveDraftFromReview={() => handleSaveDraft()}
        onGetCards={handleGetCards}
        onNotify={notify}
      />

      {confirmDialogConfig && (
        <ConfirmDialog
          open={Boolean(pendingConfirm)}
          title={confirmDialogConfig.title}
          description={confirmDialogConfig.description}
          confirmLabel={confirmDialogConfig.confirmLabel}
          destructive={confirmDialogConfig.destructive}
          onConfirm={executePendingConfirm}
          onCancel={() => setPendingConfirm(null)}
        />
      )}

      <ToastBanner toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function isHexDark(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
