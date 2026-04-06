import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/stores/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, TrendingUp } from 'lucide-react';
import { StockReceptions } from '@/components/admin/StockReceptions';
import { PurchaseOrdersTable } from '@/components/admin/purchases/PurchaseOrdersTable';
import { CreatePurchaseOrderDialog, EditPurchaseOrderDialog } from '@/components/admin/purchases/PurchaseOrderForm';
import { PdfImportDialog, XlsImportDialog, ReceiveDialog } from '@/components/admin/purchases/PdfImportDialog';
import { usePurchaseOrderState } from '@/hooks/admin/usePurchaseOrderState';
import { usePurchaseOrderHandlers } from '@/hooks/admin/usePurchaseOrderHandlers';

export default function AdminPurchases() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, isSuperAdmin } = useAuth();

  const state = usePurchaseOrderState();
  const handlers = usePurchaseOrderHandlers({ state, userId: user?.id });

  const {
    purchaseOrders, suppliers, loading,
    searchQuery, setSearchQuery, filterStatus, setFilterStatus,
    showCreate, setShowCreate, createForm, setCreateForm, creating,
    editOrder, setEditOrder, editItems, editHeader, setEditHeader, saving, deleting,
    showPdfImport, setShowPdfImport,
    pdfStep, setPdfStep, pdfSupplierId, setPdfSupplierId,
    pdfFile, setPdfFile, pdfResult, pdfItems, pdfError, setPdfError,
    pdfSaving, pdfParseProgress, pdfDragging, setPdfDragging, fileInputRef,
    showXlsImport, setShowXlsImport,
    xlsSupplierId, setXlsSupplierId, xlsPreview, setXlsPreview,
    xlsError, setXlsError, xlsSaving, xlsInputRef,
    receivingOrder, setReceivingOrder,
    receiveMode, setReceiveMode, receiveLines, setReceiveLines, receiving,
  } = state;

  const {
    fetchData, handleCreate, openEdit, addLine, removeLine, patchLine,
    handleProductSelect, totalHT, totalTTC, handleSave, handleDelete,
    handleDeleteOrder, openReceive, handleReceive,
    handleXlsFileChange, handleXlsImport,
    resetPdfImport, handlePdfParse, patchPdfItem, removePdfItem,
    handlePdfConfirm, handleDropzoneDrop,
  } = handlers;

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isSuperAdmin))) navigate('/auth');
  }, [authLoading, user, isAdmin, isSuperAdmin, navigate]);

  useEffect(() => {
    if (user && (isAdmin || isSuperAdmin)) fetchData();
  }, [user, isAdmin, isSuperAdmin]);

  // Loading / auth
  if (authLoading || loading) {
    return (
      <AdminLayout title="Gestion des Achats" description="Commandes fournisseurs et réceptions de stock">
        <div className="text-center py-10 text-muted-foreground">Chargement…</div>
      </AdminLayout>
    );
  }
  if (!user || (!isAdmin && !isSuperAdmin)) return null;

  return (
    <AdminLayout title="Gestion des Achats" description="Commandes fournisseurs et réceptions de stock">
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">
            <Package className="h-4 w-4 mr-2" />
            Bons de commande
          </TabsTrigger>
          <TabsTrigger value="receptions">
            <TrendingUp className="h-4 w-4 mr-2" />
            Réceptions de stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <PurchaseOrdersTable
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onCreateClick={() => setShowCreate(true)}
            onEditClick={openEdit}
            onDeleteClick={handleDeleteOrder}
            onReceiveClick={openReceive}
            onPdfImportClick={() => { resetPdfImport(); setShowPdfImport(true); }}
            onXlsImportClick={() => { setXlsPreview([]); setXlsError(''); setShowXlsImport(true); }}
          />
        </TabsContent>

        <TabsContent value="receptions">
          <StockReceptions />
        </TabsContent>
      </Tabs>

      <CreatePurchaseOrderDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        suppliers={suppliers}
        createForm={createForm}
        setCreateForm={setCreateForm}
        creating={creating}
        onSubmit={handleCreate}
      />

      <EditPurchaseOrderDialog
        editOrder={editOrder}
        onClose={() => setEditOrder(null)}
        suppliers={suppliers}
        editHeader={editHeader}
        setEditHeader={setEditHeader}
        editItems={editItems}
        onAddLine={addLine}
        onRemoveLine={removeLine}
        onPatchLine={patchLine}
        onProductSelect={handleProductSelect}
        totalHT={totalHT}
        totalTTC={totalTTC}
        saving={saving}
        deleting={deleting}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <XlsImportDialog
        open={showXlsImport}
        onOpenChange={setShowXlsImport}
        suppliers={suppliers}
        xlsSupplierId={xlsSupplierId}
        setXlsSupplierId={setXlsSupplierId}
        xlsPreview={xlsPreview}
        setXlsPreview={setXlsPreview}
        xlsError={xlsError}
        setXlsError={setXlsError}
        xlsSaving={xlsSaving}
        xlsInputRef={xlsInputRef}
        onFileChange={handleXlsFileChange}
        onImport={handleXlsImport}
      />

      <PdfImportDialog
        open={showPdfImport}
        onOpenChange={setShowPdfImport}
        suppliers={suppliers}
        pdfStep={pdfStep}
        setPdfStep={setPdfStep}
        pdfSupplierId={pdfSupplierId}
        setPdfSupplierId={setPdfSupplierId}
        pdfFile={pdfFile}
        setPdfFile={setPdfFile}
        pdfResult={pdfResult}
        pdfItems={pdfItems}
        pdfError={pdfError}
        setPdfError={setPdfError}
        pdfSaving={pdfSaving}
        pdfParseProgress={pdfParseProgress}
        pdfDragging={pdfDragging}
        setPdfDragging={setPdfDragging}
        fileInputRef={fileInputRef}
        onParse={handlePdfParse}
        onConfirm={handlePdfConfirm}
        onPatchItem={patchPdfItem}
        onRemoveItem={removePdfItem}
        onReset={resetPdfImport}
        onDropzoneDrop={handleDropzoneDrop}
      />

      <ReceiveDialog
        receivingOrder={receivingOrder}
        onClose={() => setReceivingOrder(null)}
        receiveMode={receiveMode}
        setReceiveMode={setReceiveMode}
        receiveLines={receiveLines}
        setReceiveLines={setReceiveLines}
        receiving={receiving}
        onReceive={handleReceive}
      />
    </AdminLayout>
  );
}
