import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData, validateAndParseData } from '@/contexts/UserDataContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Upload, Download, Trash2, FileSpreadsheet, Loader2, User, LogOut, FileText } from 'lucide-react';
import { Footer } from '@/components/Footer';

interface UserFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string;
  uploaded_at: string;
}

const TEMPLATE_CSV = `год,страна,регион,уровень_дохода,население,случаи_заболевания,смерти,успешность_лечения_проц,охват_вакцинацией_проц
2020,Россия,Европа,Выше среднего,144500000,138439,796,78.55,83.62
2020,Индия,Азия,Ниже среднего,1387552000,2915380,18505,75.33,57.62
2021,Россия,Европа,Выше среднего,145000000,135000,750,80.00,85.00`;

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { setCustomData, activeFileName, clearCustomData } = useUserData();
  const [files, setFiles] = useState<UserFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_files')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (!error && data) setFiles(data as UserFile[]);
    setLoadingFiles(false);
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'шаблон_данных.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Шаблон скачан');
  };

  const parseFile = async (file: File): Promise<Record<string, any>[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      return lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => { obj[h] = vals[i]?.trim(); });
        return obj;
      });
    }

    if (ext === 'json') {
      const text = await file.text();
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const { read, utils } = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      return utils.sheet_to_json(ws);
    }

    throw new Error('Неподдерживаемый формат файла. Загрузите CSV, Excel или JSON');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'json'].includes(ext || '')) {
      toast.error('Неподдерживаемый формат файла. Загрузите CSV, Excel или JSON');
      return;
    }

    setUploading(true);
    try {
      const rows = await parseFile(file);
      const { data: validData, error: validError } = validateAndParseData(rows);

      if (validError) {
        toast.error(validError);
        setUploading(false);
        return;
      }

      // Upload to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (storageError) {
        toast.error('Ошибка загрузки файла: ' + storageError.message);
        setUploading(false);
        return;
      }

      // Save file record
      const { error: dbError } = await supabase.from('user_files').insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: ext || 'csv',
      });

      if (dbError) {
        toast.error('Ошибка сохранения: ' + dbError.message);
        setUploading(false);
        return;
      }

      setCustomData(validData, file.name);
      await fetchFiles();
      toast.success('Файл загружен и данные применены');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обработки файла');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteFile = async (fileRecord: UserFile) => {
    await supabase.storage.from('uploads').remove([fileRecord.file_path]);
    await supabase.from('user_files').delete().eq('id', fileRecord.id);
    if (activeFileName === fileRecord.file_name) clearCustomData();
    await fetchFiles();
    toast.success('Файл удалён');
  };

  const handleLoadFile = async (fileRecord: UserFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .download(fileRecord.file_path);

      if (error || !data) {
        toast.error('Ошибка загрузки файла');
        return;
      }

      const file = new File([data], fileRecord.file_name);
      const rows = await parseFile(file);
      const { data: validData, error: validError } = validateAndParseData(rows);

      if (validError) { toast.error(validError); return; }
      setCustomData(validData, fileRecord.file_name);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="page-title">Личный кабинет</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Выйти
            </Button>
          </TooltipTrigger>
          <TooltipContent>Выйти из аккаунта</TooltipContent>
        </Tooltip>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Email: <span className="text-foreground font-medium">{user?.email}</span></p>
          {activeFileName && (
            <div className="mt-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm">Активный файл: <strong>{activeFileName}</strong></span>
              <Button variant="ghost" size="sm" onClick={clearCustomData}>Сбросить</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Шаблон данных</CardTitle>
          <CardDescription>
            Скачайте шаблон CSV-файла с обязательными колонками: год, страна, регион, население, случаи_заболевания, смерти, успешность_лечения_проц, охват_вакцинацией_проц
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-1" /> Скачать шаблон
              </Button>
            </TooltipTrigger>
            <TooltipContent>Скачать CSV-шаблон для загрузки данных</TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Загрузить данные</CardTitle>
          <CardDescription>Поддерживаемые форматы: CSV, Excel (.xlsx), JSON</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleUpload}
              disabled={uploading}
              className="cursor-pointer"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="ml-2 text-sm">Загрузка...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Загруженные файлы</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingFiles ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет загруженных файлов</p>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <button
                    onClick={() => handleLoadFile(f)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(f.uploaded_at).toLocaleDateString('ru-RU')} · {f.file_size ? `${(f.file_size / 1024).toFixed(1)} КБ` : ''}
                      </p>
                    </div>
                    {activeFileName === f.file_name && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">Активный</span>
                    )}
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteFile(f)} className="shrink-0 ml-2 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Удалить файл</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Footer />
    </div>
  );
}
