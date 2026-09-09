import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Grid2X2,
  Heart,
  Home as HomeIcon,
  LibraryBig,
  List,
  Palette,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const BOOKS_STORAGE_KEY = 'biblioteca-das-sombras-books';
const FAVORITES_STORAGE_KEY = 'biblioteca-das-sombras-favorites';
const APPEARANCE_STORAGE_KEY = 'biblioteca-das-sombras-appearance';

type BookStatus = 'reading' | 'finished' | 'queued' | 'wishlist' | 'abandoned';
type CoverStyle = 'cover-umber' | 'cover-teal' | 'cover-violet' | 'cover-ochre';
type ThemeId = 'theme-shadow' | 'theme-forest' | 'theme-midnight' | 'theme-wine';
type FontPairId = 'font-classic' | 'font-literary' | 'font-modern';

type Appearance = {
  theme: ThemeId;
  fontPair: FontPairId;
};

type Book = {
  id: number;
  title: string;
  author: string;
  series: string;
  volume: number | null;
  cover: string;
  coverStyle: CoverStyle;
  status: BookStatus;
  rating: number;
  currentPage: number;
  totalPages: number;
  startDate: string;
  endDate: string;
  notes: string;
};

type BookForm = Omit<Book, 'id'>;

const defaultBooks: Book[] = [
  {
    id: 1,
    title: 'O Nome do Vento',
    author: 'Patrick Rothfuss',
    series: 'A Crônica do Matador de Reis',
    volume: 1,
    cover: '',
    coverStyle: 'cover-umber',
    status: 'reading',
    rating: 0,
    currentPage: 417,
    totalPages: 662,
    startDate: '2026-08-10',
    endDate: '',
    notes: 'As palavras são pálidas sombras das coisas esquecidas.',
  },
  {
    id: 2,
    title: 'Piranesi',
    author: 'Susanna Clarke',
    series: '',
    volume: null,
    cover: '',
    coverStyle: 'cover-teal',
    status: 'reading',
    rating: 0,
    currentPage: 96,
    totalPages: 336,
    startDate: '2026-08-20',
    endDate: '',
    notes: 'Um diário encontrado no labirinto.',
  },
  {
    id: 3,
    title: 'A Sombra do Vento',
    author: 'Carlos Ruiz Zafón',
    series: 'O Cemitério dos Livros Esquecidos',
    volume: 1,
    cover: '',
    coverStyle: 'cover-violet',
    status: 'finished',
    rating: 5,
    currentPage: 544,
    totalPages: 544,
    startDate: '2026-06-01',
    endDate: '2026-07-11',
    notes: 'Um livro para guardar junto das memórias mais bonitas.',
  },
  {
    id: 4,
    title: 'Circe',
    author: 'Madeline Miller',
    series: '',
    volume: null,
    cover: '',
    coverStyle: 'cover-ochre',
    status: 'queued',
    rating: 0,
    currentPage: 0,
    totalPages: 393,
    startDate: '',
    endDate: '',
    notes: 'Uma feiticeira entre deuses.',
  },
  {
    id: 5,
    title: 'O Oceano no Fim do Caminho',
    author: 'Neil Gaiman',
    series: '',
    volume: null,
    cover: '',
    coverStyle: 'cover-teal',
    status: 'wishlist',
    rating: 0,
    currentPage: 0,
    totalPages: 208,
    startDate: '',
    endDate: '',
    notes: 'Memórias na beira do mundo.',
  },
  {
    id: 6,
    title: 'A Assombração da Casa da Colina',
    author: 'Shirley Jackson',
    series: '',
    volume: null,
    cover: '',
    coverStyle: 'cover-violet',
    status: 'finished',
    rating: 4,
    currentPage: 246,
    totalPages: 246,
    startDate: '2026-05-02',
    endDate: '2026-05-20',
    notes: 'Quatro pessoas em uma casa viva.',
  },
];

type NavItem = { href: string; label: string; Icon: LucideIcon };
const navItems: NavItem[] = [
  { href: '/', label: 'Início', Icon: HomeIcon },
  { href: '/lendo', label: 'Lendo', Icon: BookOpen },
  { href: '/lidos', label: 'Lidos', Icon: CheckCircle2 },
  { href: '/proximas', label: 'Próximas leituras', Icon: Clock3 },
  { href: '/desejos', label: 'Lista de desejos', Icon: Heart },
  { href: '/biblioteca', label: 'Biblioteca', Icon: LibraryBig },
];

const sectionCopy: Record<string, { eyebrow: string; title: string; intro: string }> = {
  '/lendo': {
    eyebrow: 'O capítulo aberto',
    title: 'Lendo agora',
    intro: 'As histórias que estão fazendo companhia às suas noites.',
  },
  '/lidos': {
    eyebrow: 'Volumes guardados',
    title: 'Lidos',
    intro: 'Uma pequena coleção de mundos que já encontraram lugar na memória.',
  },
  '/proximas': {
    eyebrow: 'À espera da vez',
    title: 'Próximas leituras',
    intro: 'Livros escolhidos para quando a página atual chegar ao fim.',
  },
  '/desejos': {
    eyebrow: 'Sussurros da estante',
    title: 'Lista de desejos',
    intro: 'Títulos que ainda não chegaram, mas já encontraram abrigo por aqui.',
  },
  '/biblioteca': {
    eyebrow: 'O acervo inteiro',
    title: 'Biblioteca',
    intro: 'Todos os seus volumes, reunidos em uma única sala.',
  },
};

const statusLabels: Record<BookStatus, string> = {
  reading: 'Lendo',
  finished: 'Lido',
  queued: 'Próxima',
  wishlist: 'Desejo',
  abandoned: 'Abandonado',
};

const themeOptions: { id: ThemeId; label: string; description: string; colors: string[] }[] = [
  { id: 'theme-shadow', label: 'Noite de âmbar', description: 'A atmosfera original da biblioteca.', colors: ['#2e241b', '#e9b653', '#315a52'] },
  { id: 'theme-forest', label: 'Floresta antiga', description: 'Verdes profundos e luz de musgo.', colors: ['#182822', '#d4b86a', '#35675a'] },
  { id: 'theme-midnight', label: 'Observatório', description: 'Azul noturno, prata e constelações.', colors: ['#1b202d', '#c9b5e3', '#45627b'] },
  { id: 'theme-wine', label: 'Vinho e veludo', description: 'Bordô escuro com dourado envelhecido.', colors: ['#2a1b23', '#e0ae65', '#704052'] },
];

const fontPairOptions: { id: FontPairId; label: string; description: string; sample: string }[] = [
  { id: 'font-classic', label: 'Clássica', description: 'Editorial e acolhedora.', sample: 'Libre Baskerville' },
  { id: 'font-literary', label: 'Romântica', description: 'Mais delicada e dramática.', sample: 'Cormorant Garamond' },
  { id: 'font-modern', label: 'Contemporânea', description: 'Limpa, firme e atual.', sample: 'Manrope' },
];

const nextStatus: Record<BookStatus, BookStatus> = {
  reading: 'finished',
  finished: 'reading',
  queued: 'reading',
  wishlist: 'queued',
  abandoned: 'queued',
};

function createEmptyBook(): BookForm {
  return {
    title: '',
    author: '',
    series: '',
    volume: null,
    cover: '',
    coverStyle: 'cover-umber',
    status: 'queued',
    rating: 0,
    currentPage: 0,
    totalPages: 0,
    startDate: '',
    endDate: '',
    notes: '',
  };
}

function loadBooks(): Book[] {
  if (typeof window === 'undefined') return defaultBooks;
  try {
    const stored = window.localStorage.getItem(BOOKS_STORAGE_KEY);
    if (!stored) return defaultBooks;
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Book[]) : defaultBooks;
  } catch {
    return defaultBooks;
  }
}

function loadFavorites(): Record<number, boolean> {
  if (typeof window === 'undefined') return { 1: true, 3: true, 5: true };
  try {
    const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<number, boolean>) : { 1: true, 3: true, 5: true };
  } catch {
    return { 1: true, 3: true, 5: true };
  }
}

function loadAppearance(): Appearance {
  if (typeof window === 'undefined') return { theme: 'theme-shadow', fontPair: 'font-classic' };
  try {
    const stored = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!stored) return { theme: 'theme-shadow', fontPair: 'font-classic' };
    const parsed = JSON.parse(stored) as Partial<Appearance>;
    const theme = themeOptions.some((option) => option.id === parsed.theme) ? parsed.theme as ThemeId : 'theme-shadow';
    const fontPair = fontPairOptions.some((option) => option.id === parsed.fontPair) ? parsed.fontPair as FontPairId : 'font-classic';
    return { theme, fontPair };
  } catch {
    return { theme: 'theme-shadow', fontPair: 'font-classic' };
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function progressFor(book: Book) {
  if (!book.totalPages) return 0;
  return Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
}

function BookCover({ book, className = '' }: { book: Book; className?: string }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const normalizedCover = book.cover.trim();

  useEffect(() => {
    setCoverFailed(false);
  }, [normalizedCover]);

  return (
    <div className={`book-cover ${book.coverStyle} ${className}`} data-testid={`cover-book-${book.id}`}>
      {normalizedCover && !coverFailed ? (
        <img
          className="cover-image"
          src={normalizedCover}
          alt={`Capa de ${book.title}`}
          loading="lazy"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <span className="cover-title">{book.title}</span>
      )}
    </div>
  );
}

function QuickPageEditor({ book, onChange }: { book: Book; onChange: (page: number) => void }) {
  const maxPage = Math.max(0, book.totalPages);
  const [draft, setDraft] = useState(String(book.currentPage));

  useEffect(() => {
    setDraft(String(book.currentPage));
  }, [book.currentPage]);

  const commit = () => {
    const parsed = Number(draft);
    const page = Math.min(maxPage || Number.MAX_SAFE_INTEGER, Math.max(0, Number.isFinite(parsed) ? parsed : 0));
    setDraft(String(page));
    if (page !== book.currentPage) onChange(page);
  };

  return (
    <label className="quick-page-editor" onClick={(event) => event.stopPropagation()}>
      <span>Pág.</span>
      <input
        type="number"
        min="0"
        max={maxPage || undefined}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        aria-label={`Página atual de ${book.title}`}
        data-testid={`input-current-page-${book.id}`}
      />
      <span className="quick-page-total">/ {maxPage || '—'}</span>
    </label>
  );
}

function FavoriteButton({
  active,
  onClick,
  id,
}: {
  active: boolean;
  onClick: () => void;
  id: number;
}) {
  return (
    <button
      type="button"
      className={`favorite-button ${active ? 'is-favorite' : ''}`}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      aria-label={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      data-testid={`button-favorite-${id}`}
    >
      <Heart size={15} strokeWidth={1.8} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

function StatusChip({ status }: { status: BookStatus }) {
  return (
    <span
      className={`status-chip ${status === 'finished' ? 'finished' : ''} ${status === 'wishlist' ? 'wishlist' : ''} ${status === 'abandoned' ? 'abandoned' : ''}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function BookCard({
  book,
  favorite,
  onFavorite,
  onStatusToggle,
  onPageChange,
  onOpen,
  onEdit,
  onDelete,
}: {
  book: Book;
  favorite: boolean;
  onFavorite: () => void;
  onStatusToggle: () => void;
  onPageChange: (page: number) => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className="shelf-book view-enter clickable-book"
      onClick={onOpen}
      onKeyDown={(event) => { if (event.currentTarget !== event.target) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}
      role="button"
      tabIndex={0}
      data-testid={`card-book-${book.id}`}
    >
      <div className="shelf-cover">
        <BookCover book={book} />
        <FavoriteButton active={favorite} onClick={onFavorite} id={book.id} />
        <div className="book-actions">
          <button type="button" className="book-action" onClick={(event) => { event.stopPropagation(); onEdit(); }} aria-label={`Editar ${book.title}`} data-testid={`button-edit-${book.id}`}>
            <Pencil size={13} />
          </button>
          <button type="button" className="book-action" onClick={(event) => { event.stopPropagation(); onDelete(); }} aria-label={`Excluir ${book.title}`} data-testid={`button-delete-${book.id}`}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <h3 className="shelf-book-name" data-testid={`text-title-${book.id}`}>{book.title}</h3>
      <p className="shelf-book-author">{book.author}</p>
      <button type="button" className="status-line" onClick={(event) => { event.stopPropagation(); onStatusToggle(); }} data-testid={`button-status-${book.id}`}>
        <StatusChip status={book.status} />
        {book.status === 'reading' && <span className="card-progress">{progressFor(book)}%</span>}
      </button>
      <QuickPageEditor book={book} onChange={onPageChange} />
    </article>
  );
}

function HomeView({
  books,
  favorites,
  onFavorite,
  onStatusToggle,
  onPageChange,
  onOpen,
  onEdit,
  onDelete,
}: {
  books: Book[];
  favorites: Record<number, boolean>;
  onFavorite: (id: number) => void;
  onStatusToggle: (id: number) => void;
  onPageChange: (id: number, page: number) => void;
  onOpen: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}) {
  const featured = books.find((book) => book.status === 'reading') ?? books[0];
  const companions = books.filter((book) => book.id !== featured?.id).slice(0, 3);
  const readingCount = books.filter((book) => book.status === 'reading').length;
  const pagesLogged = books.reduce((total, book) => total + book.currentPage, 0);

  if (!featured) {
    return (
      <div className="empty-state view-enter">
        <Sparkles size={25} strokeWidth={1.3} />
        <h3>Esta sala ainda está silenciosa</h3>
        <p>Adicione seu primeiro livro para acender a biblioteca.</p>
      </div>
    );
  }

  return (
    <div className="view-enter">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Uma sala só sua</p>
          <h1 className="hero-title">Entre. A noite ainda guarda <em>boas histórias.</em></h1>
          <p className="hero-description">Sua biblioteca pessoal para acompanhar os livros que atravessam o silêncio, uma página de cada vez.</p>
          <Link href="/lendo" className="button-primary" data-testid="link-continue-reading">Continuar lendo <ChevronRight size={15} /></Link>
        </div>
        <div className="hero-ornament" aria-hidden="true">
          <div className="moon" />
          <div className="hero-branch" />
        </div>
      </section>

      <div className="section-heading">
        <h2 className="section-title">A leitura da noite</h2>
        <Link href="/lendo" className="section-link" data-testid="link-see-reading">Ver todos <ChevronRight size={12} /></Link>
      </div>
      <section className="reading-layout">
        <article
          className="feature-book clickable-book"
          onClick={() => onOpen(featured)}
          onKeyDown={(event) => { if (event.currentTarget !== event.target) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(featured); } }}
          role="button"
          tabIndex={0}
          data-testid="card-featured-book"
        >
          <BookCover book={featured} />
          <div className="book-meta">
            <span className="book-kicker">{statusLabels[featured.status]} · {featured.currentPage} de {featured.totalPages || '—'} páginas</span>
            <h3 className="book-name">{featured.title}</h3>
            <span className="book-author">{featured.author}</span>
            <p className="book-quote">{featured.notes ? `“${featured.notes}”` : '“Uma história esperando para ser descoberta.”'}</p>
            <div className="book-progress-line">
              <div className="progress-label"><span>Progresso</span><strong>{progressFor(featured)}%</strong></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progressFor(featured)}%` }} /></div>
            </div>
            <QuickPageEditor book={featured} onChange={(page) => onPageChange(featured.id, page)} />
            <button type="button" className="feature-status-button" onClick={(event) => { event.stopPropagation(); onStatusToggle(featured.id); }} data-testid="button-feature-status">
              {featured.status === 'finished' ? <><BookOpen size={13} /> Voltar para lendo</> : <><Check size={13} /> Marcar como lido</>}
            </button>
          </div>
          <FavoriteButton active={favorites[featured.id]} onClick={() => onFavorite(featured.id)} id={featured.id} />
        </article>
        <div className="mini-reading">
          {companions.map((book) => (
            <article
              className="mini-card clickable-book"
              key={book.id}
              onClick={() => onOpen(book)}
              onKeyDown={(event) => { if (event.currentTarget !== event.target) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(book); } }}
              role="button"
              tabIndex={0}
              data-testid={`card-companion-${book.id}`}
            >
              <BookCover book={book} className="mini-cover" />
              <div className="mini-card-copy">
                <h3 className="mini-card-title">{book.title}</h3>
                <p className="mini-card-author">{book.author}</p>
                <button type="button" className="mini-status" onClick={(event) => { event.stopPropagation(); onStatusToggle(book.id); }} data-testid={`button-mini-status-${book.id}`}>
                  <StatusChip status={book.status} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="stats-strip" aria-label="Resumo da biblioteca" data-testid="section-library-stats">
        <div className="stat-item"><span className="stat-value">{String(books.length).padStart(2, '0')}</span><span className="stat-label">livros no acervo</span></div>
        <div className="stat-item"><span className="stat-value">{String(readingCount).padStart(2, '0')}</span><span className="stat-label">leituras em curso</span></div>
        <div className="stat-item"><span className="stat-value">{pagesLogged}</span><span className="stat-label">páginas registradas</span></div>
      </section>

      <div className="section-heading">
        <h2 className="section-title">Nas prateleiras</h2>
        <Link href="/biblioteca" className="section-link" data-testid="link-see-library">Abrir biblioteca <ChevronRight size={12} /></Link>
      </div>
      <section className="shelf-grid">
        {books.slice(0, 4).map((book) => (
          <BookCard
            key={book.id}
            book={book}
            favorite={favorites[book.id]}
            onFavorite={() => onFavorite(book.id)}
            onStatusToggle={() => onStatusToggle(book.id)}
            onPageChange={(page) => onPageChange(book.id, page)}
            onOpen={() => onOpen(book)}
            onEdit={() => onEdit(book)}
            onDelete={() => onDelete(book)}
          />
        ))}
      </section>
    </div>
  );
}

function CollectionView({
  path,
  booksToShow,
  favorites,
  view,
  onViewChange,
  onFavorite,
  onStatusToggle,
  onPageChange,
  onOpen,
  onEdit,
  onDelete,
}: {
  path: string;
  booksToShow: Book[];
  favorites: Record<number, boolean>;
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  onFavorite: (id: number) => void;
  onStatusToggle: (id: number) => void;
  onPageChange: (id: number, page: number) => void;
  onOpen: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}) {
  const copy = sectionCopy[path];
  const isLibrary = path === '/biblioteca';

  return (
    <div className="view-enter">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1 className="page-title" data-testid="text-page-title">{copy.title}</h1>
      <p className="page-intro">{copy.intro}</p>
      <div className="library-toolbar">
        <span className="toolbar-count" data-testid="text-book-count">{booksToShow.length} {booksToShow.length === 1 ? 'volume' : 'volumes'}</span>
        {isLibrary && (
          <div className="view-toggle" aria-label="Modo de visualização">
            <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => onViewChange('grid')} aria-label="Visualização em grade" data-testid="button-view-grid"><Grid2X2 size={15} /></button>
            <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => onViewChange('list')} aria-label="Visualização em lista" data-testid="button-view-list"><List size={16} /></button>
          </div>
        )}
      </div>
      {booksToShow.length === 0 ? (
        <div className="empty-state" data-testid="empty-collection">
          <Sparkles size={25} strokeWidth={1.3} />
          <h3>Esta sala ainda está silenciosa</h3>
          <p>Não encontramos nenhum volume aqui com esse termo. Tente outra busca ou explore a biblioteca inteira.</p>
        </div>
      ) : isLibrary && view === 'list' ? (
        <div className="library-list" data-testid="list-library">
          {booksToShow.map((book) => (
            <div
              className="library-row clickable-book"
              key={book.id}
              onClick={() => onOpen(book)}
              onKeyDown={(event) => { if (event.currentTarget !== event.target) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(book); } }}
              role="button"
              tabIndex={0}
              data-testid={`row-book-${book.id}`}
            >
              <BookCover book={book} className="list-cover" />
              <div><div className="list-name">{book.title}</div><div className="list-author">{book.author}</div></div>
              <span className="list-status">{book.status === 'reading' ? `${progressFor(book)}% lido` : book.notes || `${book.currentPage} de ${book.totalPages} páginas`}</span>
              <QuickPageEditor book={book} onChange={(page) => onPageChange(book.id, page)} />
              <StatusChip status={book.status} />
              <div className="row-actions">
                <button type="button" className="row-action" onClick={(event) => { event.stopPropagation(); onEdit(book); }} aria-label={`Editar ${book.title}`} data-testid={`button-row-edit-${book.id}`}><Pencil size={14} /></button>
                <button type="button" className="row-action" onClick={(event) => { event.stopPropagation(); onDelete(book); }} aria-label={`Excluir ${book.title}`} data-testid={`button-row-delete-${book.id}`}><Trash2 size={14} /></button>
                <button type="button" className="row-action" onClick={(event) => { event.stopPropagation(); onStatusToggle(book.id); }} aria-label={`Alterar estado de ${book.title}`} data-testid={`button-row-status-${book.id}`}>
                  {book.status === 'finished' ? <BookOpen size={15} /> : <CheckCircle2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <section className="shelf-grid" data-testid="grid-collection">
          {booksToShow.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              favorite={favorites[book.id]}
              onFavorite={() => onFavorite(book.id)}
              onStatusToggle={() => onStatusToggle(book.id)}
              onPageChange={(page) => onPageChange(book.id, page)}
              onOpen={() => onOpen(book)}
              onEdit={() => onEdit(book)}
              onDelete={() => onDelete(book)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function BookFormModal({
  open,
  editingBook,
  onClose,
  onSave,
}: {
  open: boolean;
  editingBook: Book | null;
  onClose: () => void;
  onSave: (book: BookForm) => void;
}) {
  const [form, setForm] = useState<BookForm>(() => editingBook ? { ...editingBook } : createEmptyBook());
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(editingBook ? { ...editingBook } : createEmptyBook());
      setError('');
    }
  }, [open, editingBook]);

  if (!open) return null;

  const update = <K extends keyof BookForm>(field: K, value: BookForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.author.trim()) {
      setError('Preencha pelo menos o título e o autor para guardar este volume.');
      return;
    }
    onSave({
      ...form,
      title: form.title.trim(),
      author: form.author.trim(),
      currentPage: Math.max(0, form.currentPage || 0),
      totalPages: Math.max(0, form.totalPages || 0),
      rating: Math.min(5, Math.max(0, form.rating || 0)),
    });
  };

  const previewBook = { ...form, id: -1 };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="book-modal" role="dialog" aria-modal="true" aria-labelledby="book-modal-title">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{editingBook ? 'Editar volume' : 'Novo volume'}</p>
            <h2 id="book-modal-title">{editingBook ? 'Reabrir uma história' : 'Adicionar livro'}</h2>
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Fechar formulário"><X size={17} /></button>
        </div>
        <form className="book-form" onSubmit={handleSubmit}>
          <div className="form-cover-column">
            <BookCover book={previewBook} className="form-cover-preview" />
            <label className="form-field">
              <span>Capa</span>
              <input type="url" value={form.cover} onChange={(event) => update('cover', event.target.value)} placeholder="URL da capa (opcional)" />
            </label>
            <label className="form-field">
              <span>Cor da capa</span>
              <select value={form.coverStyle} onChange={(event) => update('coverStyle', event.target.value as CoverStyle)}>
                <option value="cover-umber">Âmbar</option>
                <option value="cover-teal">Verde profundo</option>
                <option value="cover-violet">Violeta</option>
                <option value="cover-ochre">Ocre</option>
              </select>
            </label>
          </div>
          <div className="form-fields">
            <div className="form-grid">
              <label className="form-field form-field-full"><span>Título *</span><input required value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Nome do livro" /></label>
              <label className="form-field"><span>Autor *</span><input required value={form.author} onChange={(event) => update('author', event.target.value)} placeholder="Quem escreveu" /></label>
              <label className="form-field"><span>Série / coleção</span><input value={form.series} onChange={(event) => update('series', event.target.value)} placeholder="Opcional" /></label>
              <label className="form-field"><span>Número do volume</span><input type="number" min="0" value={form.volume ?? ''} onChange={(event) => update('volume', event.target.value === '' ? null : Number(event.target.value))} placeholder="—" /></label>
              <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => update('status', event.target.value as BookStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="form-field"><span>Página atual</span><input type="number" min="0" value={form.currentPage} onChange={(event) => update('currentPage', Number(event.target.value))} /></label>
              <label className="form-field"><span>Total de páginas</span><input type="number" min="0" value={form.totalPages} onChange={(event) => update('totalPages', Number(event.target.value))} /></label>
              <label className="form-field"><span>Data de início</span><input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} /></label>
              <label className="form-field"><span>Data de término</span><input type="date" value={form.endDate} onChange={(event) => update('endDate', event.target.value)} /></label>
              <div className="form-field form-field-full"><span>Nota</span><div className="rating-input" aria-label="Nota de 0 a 5 estrelas">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" className={star <= form.rating ? 'active' : ''} onClick={() => update('rating', star)} aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}>★</button>)}<button type="button" className="rating-clear" onClick={() => update('rating', 0)}>Limpar</button></div></div>
              <label className="form-field form-field-full"><span>Observações pessoais</span><textarea rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Uma frase, uma memória, um presságio..." /></label>
            </div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="button-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button-primary"><Check size={14} /> Guardar livro</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function formatBookDate(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function BookDetailModal({
  book,
  favorite,
  onClose,
  onEdit,
  onDelete,
  onFavorite,
  onStatusToggle,
}: {
  book: Book | null;
  favorite: boolean;
  onClose: () => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
  onFavorite: (id: number) => void;
  onStatusToggle: (id: number) => void;
}) {
  if (!book) return null;

  const progress = progressFor(book);
  const rating = Array.from({ length: 5 }, (_, index) => index < book.rating);

  return (
    <div className="modal-backdrop detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="book-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="book-detail-title">
        <div className="modal-head">
          <div>
            <p className="eyebrow">Volume selecionado</p>
            <h2 id="book-detail-title">Dentro da história</h2>
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Fechar detalhes"><X size={17} /></button>
        </div>

        <div className="book-detail">
          <div className="detail-cover-column">
            <BookCover book={book} className="detail-cover" />
            <button type="button" className={`detail-favorite ${favorite ? 'active' : ''}`} onClick={() => onFavorite(book.id)}>
              <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
              {favorite ? 'Nos favoritos' : 'Adicionar aos favoritos'}
            </button>
          </div>

          <div className="detail-copy">
            <div className="detail-status-line"><StatusChip status={book.status} /><span>{progress}% percorrido</span></div>
            <h3 className="detail-title">{book.title}</h3>
            <p className="detail-author">{book.author}</p>
            {(book.series || book.volume) && <p className="detail-series">{book.series}{book.series && book.volume ? ' · ' : ''}{book.volume ? `Volume ${book.volume}` : ''}</p>}

            <div className="detail-facts">
              <div className="detail-fact"><span>Página atual</span><strong>{book.currentPage} <small>/ {book.totalPages || '—'}</small></strong></div>
              <div className="detail-fact"><span>Nota</span><strong className="detail-rating" aria-label={`${book.rating} de 5 estrelas`}>{rating.map((active, index) => <span key={index} className={active ? 'active' : ''}>★</span>)}</strong></div>
              <div className="detail-fact"><span>Começou em</span><strong>{formatBookDate(book.startDate)}</strong></div>
              <div className="detail-fact"><span>Terminou em</span><strong>{formatBookDate(book.endDate)}</strong></div>
            </div>

            <div className="detail-progress">
              <div className="progress-label"><span>Progresso de leitura</span><strong>{progress}%</strong></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="detail-notes">
              <span>Observações</span>
              <p>{book.notes || 'Nenhuma observação registrada para este volume.'}</p>
            </div>

            <div className="detail-actions">
              <button type="button" className="button-primary detail-edit-button" onClick={() => onEdit(book)} data-testid={`button-detail-edit-${book.id}`}><Pencil size={16} /> Editar informações</button>
              <button type="button" className="button-quiet detail-status-button" onClick={() => onStatusToggle(book.id)}><CheckCircle2 size={16} /> Alterar status</button>
              <button type="button" className="detail-delete-button" onClick={() => onDelete(book)}><Trash2 size={15} /> Excluir</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AppearanceModal({
  open,
  appearance,
  onClose,
  onThemeChange,
  onFontPairChange,
}: {
  open: boolean;
  appearance: Appearance;
  onClose: () => void;
  onThemeChange: (theme: ThemeId) => void;
  onFontPairChange: (fontPair: FontPairId) => void;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="book-modal appearance-modal" role="dialog" aria-modal="true" aria-labelledby="appearance-modal-title">
        <div className="modal-head">
          <div>
            <p className="eyebrow">A sala também é sua</p>
            <h2 id="appearance-modal-title">Aparência</h2>
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Fechar aparência"><X size={17} /></button>
        </div>
        <div className="appearance-section">
          <div className="appearance-section-title"><Palette size={15} /><span>Tema da biblioteca</span></div>
          <div className="appearance-options theme-options">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`appearance-option ${appearance.theme === option.id ? 'active' : ''}`}
                onClick={() => onThemeChange(option.id)}
                data-testid={`button-theme-${option.id}`}
              >
                <span className="theme-swatches">{option.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}</span>
                <span className="appearance-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                <span className="appearance-check">{appearance.theme === option.id ? 'Atual' : ''}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="appearance-section">
          <div className="appearance-section-title"><Type size={15} /><span>Tipografia</span></div>
          <div className="appearance-options font-options">
            {fontPairOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`appearance-option font-option ${option.id} ${appearance.fontPair === option.id ? 'active' : ''}`}
                onClick={() => onFontPairChange(option.id)}
                data-testid={`button-font-${option.id}`}
              >
                <span className="font-sample">{option.sample}</span>
                <span className="appearance-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                <span className="appearance-check">{appearance.fontPair === option.id ? 'Atual' : ''}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="appearance-note">Suas escolhas ficam salvas neste dispositivo.</p>
      </section>
    </div>
  );
}

function LibraryView() {
  const [location] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [books, setBooks] = useState<Book[]>(loadBooks);
  const [favorites, setFavorites] = useState<Record<number, boolean>>(loadFavorites);
  const [appearance, setAppearance] = useState<Appearance>(loadAppearance);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  }, [appearance]);

  const path = location === '/' ? '/' : location;
  const copy = sectionCopy[path];
  const filteredBooks = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const searched = books.filter((book) => !term || `${book.title} ${book.author} ${book.series}`.toLocaleLowerCase().includes(term));
    if (path === '/lendo') return searched.filter((book) => book.status === 'reading');
    if (path === '/lidos') return searched.filter((book) => book.status === 'finished');
    if (path === '/proximas') return searched.filter((book) => book.status === 'queued');
    if (path === '/desejos') return searched.filter((book) => book.status === 'wishlist');
    return searched;
  }, [books, path, query]);

  const openAdd = () => {
    setEditingBook(null);
    setIsFormOpen(true);
  };

  const openEdit = (book: Book) => {
    setSelectedBookId(null);
    setEditingBook(book);
    setIsFormOpen(true);
  };

  const saveBook = (bookData: BookForm) => {
    if (editingBook) {
      setBooks((current) => current.map((book) => book.id === editingBook.id ? { ...bookData, id: book.id } : book));
    } else {
      setBooks((current) => [...current, { ...bookData, id: Date.now() }]);
    }
    setIsFormOpen(false);
    setEditingBook(null);
  };

  const deleteBook = (book: Book) => {
    if (!window.confirm(`Excluir “${book.title}” da biblioteca?`)) return;
    setBooks((current) => current.filter((item) => item.id !== book.id));
    setSelectedBookId((current) => current === book.id ? null : current);
    setFavorites((current) => {
      const next = { ...current };
      delete next[book.id];
      return next;
    });
  };

  const toggleFavorite = (id: number) => setFavorites((current) => ({ ...current, [id]: !current[id] }));

  const updatePage = (id: number, page: number) => {
    setBooks((current) => current.map((book) => book.id === id ? { ...book, currentPage: page } : book));
  };

  const toggleStatus = (id: number) => {
    setBooks((current) => current.map((book) => {
      if (book.id !== id) return book;
      const status = nextStatus[book.status];
      return {
        ...book,
        status,
        currentPage: status === 'finished' ? book.totalPages : book.currentPage,
        endDate: status === 'finished' ? today() : status === 'reading' ? '' : book.endDate,
        startDate: status === 'reading' ? book.startDate || today() : book.startDate,
      };
    }));
  };

  const selectedBook = selectedBookId === null ? null : books.find((book) => book.id === selectedBookId) ?? null;

  return (
    <div className={`app-shell ${appearance.theme} ${appearance.fontPair}`}>
      <aside className="app-sidebar">
        <Link href="/" className="brand-lockup" data-testid="link-brand">
          <BookOpen className="brand-mark" size={25} strokeWidth={1.5} />
          <div><div className="brand-name">Biblioteca das Sombras</div><div className="brand-subtitle">seu refúgio de leitura</div></div>
        </Link>
        <div className="nav-label">Suas salas</div>
        <nav className="nav-list" aria-label="Navegação principal">
          {navItems.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={`nav-item ${path === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLocaleLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={17} strokeWidth={1.7} /><span className="nav-item-label">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot"><div className="shelf-note"><Sparkles size={14} /><span>A luz fica acesa enquanto você lê.</span></div></div>
      </aside>

      <main className="main-frame">
        <div className="main-content">
          <header className="topbar">
            <div className="breadcrumb">Biblioteca das Sombras <span>/</span> <strong>{path === '/' ? 'Início' : copy?.title}</strong></div>
            <div className="top-actions">
              {searchOpen && <div className="search-wrap"><Search size={15} /><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no acervo..." aria-label="Buscar no acervo" data-testid="input-search" /><button type="button" className="search-close" onClick={() => { setSearchOpen(false); setQuery(''); }} aria-label="Fechar busca" data-testid="button-close-search"><X size={14} /></button></div>}
              <button type="button" className="button-primary add-book-button" onClick={openAdd} data-testid="button-add-book"><Plus size={14} /><span>Adicionar livro</span></button>
              <button type="button" className="icon-button" onClick={() => setSearchOpen((open) => !open)} aria-label={searchOpen ? 'Fechar busca' : 'Abrir busca'} data-testid="button-toggle-search"><Search size={17} /></button>
              <button type="button" className="profile-token" aria-label="Abrir aparência" onClick={() => setAppearanceOpen(true)} data-testid="avatar-sofia">SO</button>
            </div>
          </header>

          {path === '/' ? (
            <HomeView books={books} favorites={favorites} onFavorite={toggleFavorite} onStatusToggle={toggleStatus} onPageChange={updatePage} onOpen={(book) => setSelectedBookId(book.id)} onEdit={openEdit} onDelete={deleteBook} />
          ) : (
            <CollectionView path={path} booksToShow={filteredBooks} favorites={favorites} view={view} onViewChange={setView} onFavorite={toggleFavorite} onStatusToggle={toggleStatus} onPageChange={updatePage} onOpen={(book) => setSelectedBookId(book.id)} onEdit={openEdit} onDelete={deleteBook} />
          )}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {navItems.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={`nav-item ${path === href ? 'active' : ''}`} aria-label={label} data-testid={`link-mobile-nav-${label.toLocaleLowerCase().replaceAll(' ', '-')}`}>
            <Icon size={17} strokeWidth={1.7} /><span className="nav-item-label">{label === 'Próximas leituras' ? 'Próximas' : label}</span>
          </Link>
        ))}
      </nav>

      <BookFormModal open={isFormOpen} editingBook={editingBook} onClose={() => { setIsFormOpen(false); setEditingBook(null); }} onSave={saveBook} />
      <BookDetailModal book={selectedBook} favorite={selectedBook ? Boolean(favorites[selectedBook.id]) : false} onClose={() => setSelectedBookId(null)} onEdit={openEdit} onDelete={deleteBook} onFavorite={toggleFavorite} onStatusToggle={toggleStatus} />
      <AppearanceModal open={appearanceOpen} appearance={appearance} onClose={() => setAppearanceOpen(false)} onThemeChange={(theme) => setAppearance((current) => ({ ...current, theme }))} onFontPairChange={(fontPair) => setAppearance((current) => ({ ...current, fontPair }))} />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={LibraryView} />
        <Route path="/lendo" component={LibraryView} />
        <Route path="/lidos" component={LibraryView} />
        <Route path="/proximas" component={LibraryView} />
        <Route path="/desejos" component={LibraryView} />
        <Route path="/biblioteca" component={LibraryView} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;