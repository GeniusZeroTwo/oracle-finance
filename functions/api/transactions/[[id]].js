// 处理所有 /api/transactions 路由 (列表、新增、删除)
export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    // 鉴权已由 /api/_middleware.js 统一处理
    const db = env.DB;
    const id = (params.id && params.id.length > 0) ? params.id[0] : undefined;

    // ==========================================
    // 根路径路由 (/api/transactions)
    // ==========================================
    if (!id) {
      if (request.method === 'GET') {
        const { results } = await db.prepare("SELECT * FROM transactions ORDER BY rowid DESC").all();
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'POST') {
        const data = await request.json();
        await db.prepare(
          "INSERT INTO transactions (id, type, amount, category, date, description) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(data.id, data.type, data.amount, data.category, data.date, data.description || '').run();
        
        return new Response(JSON.stringify({ success: true }), { 
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: `Method not allowed on root: ${request.method}` }), { 
        status: 405, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // ==========================================
    // ID 路径路由 (/api/transactions/:id)
    // ==========================================
    if (request.method === 'DELETE') {
      await db.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
      
      return new Response(JSON.stringify({ success: true }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (request.method === 'PUT') {
      const data = await request.json();
      
      const existing = await db.prepare("SELECT id FROM transactions WHERE id = ?").bind(id).first();
      if (existing) {
        await db.prepare(
          "UPDATE transactions SET type=?, amount=?, category=?, date=?, description=? WHERE id=?"
        ).bind(data.type, data.amount, data.category, data.date, data.description || '', id).run();
      } else {
        await db.prepare(
          "INSERT INTO transactions (id, type, amount, category, date, description) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(id, data.type, data.amount, data.category, data.date, data.description || '').run();
      }
      
      return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: `Method not allowed on ID route: ${request.method}` }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('transactions/[[id]].js 顶层错误:', error.message, error.stack);
    return new Response(JSON.stringify({ error: "服务器内部错误: " + error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

