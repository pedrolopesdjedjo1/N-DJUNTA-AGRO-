// backend/src/lib/avisosSql.ts
// Avisos automáticos feitos pelo próprio banco. Cada aviso vira uma linha na tabela notifications
// (tela "Notificações" do app). Os blocos com EXCEPTION garantem que um erro no aviso
// nunca impede a operação principal (oferta, pagamento, entrega, etc.).

// Função que grava um aviso para um utilizador (ignora erros)
export const FUNCAO_NOTIFICAR = `CREATE OR REPLACE FUNCTION agro_notificar(uid text, titulo text, msg text) RETURNS void AS $$
BEGIN
  IF uid IS NULL OR uid = '' THEN
    RETURN;
  END IF;
  BEGIN
    INSERT INTO notifications (id, "userId", type, title, message, "isRead", "createdAt")
    VALUES (gen_random_uuid()::text, uid, 'SISTEMA'::"NotificationType", titulo, msg, false, now());
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$ LANGUAGE plpgsql`;

// Gera os 3 comandos de um gatilho: função, remoção do gatilho antigo e criação do novo.
// "corpo" usa NEW, OLD e PERFORM agro_notificar(...).
export function gatilho(tabela: string, nome: string, momento: 'INSERT' | 'UPDATE', corpo: string): string[] {
  return [
    `CREATE OR REPLACE FUNCTION agro_fn_${nome}() RETURNS trigger AS $$
     BEGIN
       BEGIN
         ${corpo}
       EXCEPTION WHEN OTHERS THEN
         NULL;
       END;
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql`,
    `DROP TRIGGER IF EXISTS agro_trg_${nome} ON ${tabela}`,
    `CREATE TRIGGER agro_trg_${nome} AFTER ${momento} ON ${tabela}
       FOR EACH ROW EXECUTE FUNCTION agro_fn_${nome}()`,
  ];
}
