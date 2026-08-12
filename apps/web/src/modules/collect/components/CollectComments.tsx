// Composant de commentaires inline pour une question ou section de collecte
import React, { useState } from 'react';
import { useCollectComments } from '../hooks/useCollectComments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Check, Trash2, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  sessionId: string;
  targetKey: string;
  label?: string;
}

export const CollectComments: React.FC<Props> = ({ sessionId, targetKey, label }) => {
  const { comments, isLoading, addComment, resolveComment, deleteComment } = useCollectComments(sessionId, targetKey);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const unresolvedCount = comments.filter(c => !c.is_resolved).length;

  const handleSubmit = () => {
    if (!text.trim()) return;
    addComment.mutate({ content: text.trim() }, {
      onSuccess: () => setText(''),
    });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {unresolvedCount > 0 && (
          <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {unresolvedCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-popover p-3 shadow-lg space-y-3">
          {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}

          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : comments.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map(c => (
                <div
                  key={c.id}
                  className={`text-sm p-2 rounded border ${c.is_resolved ? 'bg-muted/50 opacity-60' : 'bg-background'}`}
                >
                  <p className="text-foreground">{c.content}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                    </span>
                    <div className="flex gap-1">
                      {!c.is_resolved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => resolveComment.mutate(c.id)}
                          title="Résoudre"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive"
                        onClick={() => deleteComment.mutate(c.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">Aucun commentaire</p>
          )}

          <div className="flex gap-2">
            <Textarea
              placeholder="Ajouter un commentaire..."
              value={text}
              onChange={e => setText(e.target.value)}
              className="text-sm min-h-[60px] resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
            />
            <Button
              size="icon"
              className="shrink-0 self-end"
              onClick={handleSubmit}
              disabled={!text.trim() || addComment.isPending}
            >
              {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
