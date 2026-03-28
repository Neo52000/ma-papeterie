import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import HTMLFlipBook from "react-pageflip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import React from "react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker — served from /public to comply with CSP worker-src 'self'
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface FlipbookContentProps {
  pdfUrl: string;
  title: string;
}

// ForwardRef page component for react-pageflip
const FlipPage = React.forwardRef<HTMLDivElement, { pageNumber: number; width: number }>(
  ({ pageNumber, width }, ref) => (
    <div ref={ref} className="bg-white shadow-md">
      <Page
        pageNumber={pageNumber}
        width={width}
        renderAnnotationLayer={false}
        renderTextLayer={false}
        loading={
          <div className="flex items-center justify-center" style={{ width, height: width * 1.414 }}>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      />
    </div>
  )
);
FlipPage.displayName = "FlipPage";

export default function FlipbookContent({ pdfUrl, title: _title }: FlipbookContentProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, setLoading] = useState(true);
  const flipBookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPageWidth = useCallback(() => {
    if (isFullscreen) return Math.min(window.innerWidth * 0.4, 500);
    return typeof window !== "undefined" && window.innerWidth < 768 ? window.innerWidth - 64 : 400;
  }, [isFullscreen]);

  const [pageWidth, setPageWidth] = useState(getPageWidth());

  useEffect(() => {
    const handleResize = () => setPageWidth(getPageWidth());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getPageWidth]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onFlip(e: any) {
    setCurrentPage(e.data);
  }

  function goToPrev() {
    flipBookRef.current?.pageFlip()?.flipPrev();
  }

  function goToNext() {
    flipBookRef.current?.pageFlip()?.flipNext();
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center gap-4 ${isFullscreen ? "bg-background p-8 justify-center h-full" : ""}`}
    >
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center h-[500px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Chargement du catalogue...</span>
          </div>
        }
      >
        {numPages > 0 && (
          <div className="flipbook-container">
            {/* @ts-ignore - react-pageflip types incomplete */}
            <HTMLFlipBook
              ref={flipBookRef}
              width={pageWidth}
              height={Math.round(pageWidth * 1.414)}
              size="stretch"
              minWidth={280}
              maxWidth={600}
              minHeight={400}
              maxHeight={850}
              showCover={true}
              onFlip={onFlip}
              className="shadow-2xl rounded-lg"
              flippingTime={600}
              useMouseEvents={true}
              maxShadowOpacity={0.3}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <FlipPage key={i} pageNumber={i + 1} width={pageWidth} />
              ))}
            </HTMLFlipBook>
          </div>
        )}
      </Document>

      {/* Controls */}
      {numPages > 0 && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Button variant="outline" size="sm" onClick={goToPrev} disabled={currentPage === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          <span className="text-sm text-muted-foreground min-w-[80px] text-center">
            Page {currentPage + 1} / {numPages}
          </span>
          <Button variant="outline" size="sm" onClick={goToNext} disabled={currentPage >= numPages - 1}>
            Suivant <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="outline" size="icon" onClick={toggleFullscreen} title="Plein écran">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={pdfUrl} download target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-1" /> Télécharger
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
