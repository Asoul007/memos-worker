const NOTES_PER_PAGE = 10;
const SESSION_DURATION_SECONDS = 30*86400; // Session 鏈夋晥鏈? 30 澶?
const SESSION_COOKIE = '__session';
export default {
	async fetch(request, env, ctx) {
		return await handleApiRequest(request, env);
	},
};

/**
 * API 璇锋眰鐨勭粺涓€澶勭悊鍣ㄥ拰璺敱
 */
async function handleApiRequest(request, env) {
	const { pathname } = new URL(request.url);

	// --- Memos 鍒嗕韩鍏紑璺敱 ---
	// 鍖归厤鍒嗕韩椤甸潰 /share/some-uuid
	const sharePageMatch = pathname.match(/^\/share\/([a-zA-Z0-9-]+)$/);
	if (sharePageMatch) {
		const publicId = sharePageMatch[1];
		// 鏋勫缓鐩爣 URL锛屽皢 publicId 浣滀负鏌ヨ鍙傛暟
		const targetUrl = new URL('/share.html', request.url);
		targetUrl.searchParams.set('id', publicId);
		// 杩斿洖涓€涓?302 涓存椂閲嶅畾鍚戝搷搴?
		return Response.redirect(targetUrl.toString(), 302);
	}
	// 鍖归厤鑾峰彇鍒嗕韩鍐呭鐨勫叕寮€ API /api/public/note/some-uuid
	const publicNoteMatch = pathname.match(/^\/api\/public\/note\/([a-zA-Z0-9-]+)$/);
	if (publicNoteMatch && request.method === 'GET') {
		const publicId = publicNoteMatch[1];
		return handlePublicNoteRequest(publicId, env);
	}
	// 鍖归厤鑾峰彇鍒嗕韩 Raw 鍐呭鐨勫叕寮€ API /api/public/note/raw/some-uuid
	const publicRawNoteMatch = pathname.match(/^\/api\/public\/note\/raw\/([a-zA-Z0-9-]+)$/);
	if (publicRawNoteMatch && request.method === 'GET') {
		const publicId = publicRawNoteMatch[1];
		return handlePublicRawNoteRequest(publicId, env);
	}
	// --- Memos 鍒嗕韩鍏紑璺敱 ---

	// 鍏紑鏂囦欢璁块棶璺敱 (蹇呴』鍦ㄨ韩浠介獙璇佷箣鍓?
	const publicFileMatch = pathname.match(/^\/api\/public\/file\/([a-zA-Z0-9-]+)$/);
	if (publicFileMatch) {
		const publicId = publicFileMatch[1];
		return handlePublicFileRequest(publicId, request, env);
	}

	const tgProxyMatch = pathname.match(/^\/api\/tg-media-proxy\/([^\/]+)$/);
	if (tgProxyMatch) {
		return handleTelegramProxy(request, env);
	}
	// --- Telegram Webhook 璺敱 ---
	const telegramMatch = pathname.match(/^\/api\/telegram_webhook\/([^\/]+)$/);
	if (request.method === 'POST' && telegramMatch) {
		const secret = telegramMatch[1];
		return handleTelegramWebhook(request, env, secret);
	}

	if (request.method === 'POST' && pathname === '/api/login') {
		return handleLogin(request, env);
	}
	if (request.method === 'POST' && pathname === '/api/logout') {
		return handleLogout(request, env);
	}

	// --- 浠庤繖閲屽紑濮嬶紝鎵€鏈?API 閮介渶瑕佽璇?---
	const session = await isSessionAuthenticated(request, env);
	if (!session) {
		return jsonResponse({ error: 'Unauthorized' }, 401);
	}

	if (request.method === 'POST' && pathname === '/api/notes/merge') {
		return handleMergeNotes(request, env);
	}

	const shareNoteMatch = pathname.match(/^\/api\/notes\/(\d+)\/share$/);
	if (shareNoteMatch) {
		const [, noteId] = shareNoteMatch;
		if (request.method === 'POST') {
			return handleShareNoteRequest(noteId, request, env);
		}
		if (request.method === 'DELETE') {
			return handleUnshareNoteRequest(noteId, env);
		}
	}

	const shareFileMatch = pathname.match(/^\/api\/notes\/(\d+)\/files\/([a-zA-Z0-9-]+)\/share$/);
	if (shareFileMatch && request.method === 'POST') {
		const [, noteId, fileId] = shareFileMatch;
		return handleShareFileRequest(noteId, fileId, request, env);
	}

	// --- START: 鏇存柊鍚庣殑 Docs API 璺敱 ---
	if (pathname.startsWith('/api/docs')) {
		if (pathname === '/api/docs/tree' && request.method === 'GET') {
			return handleDocsTree(request, env);
		}
		if (pathname === '/api/docs/node' && request.method === 'POST') {
			return handleDocsNodeCreate(request, env);
		}

		// 鍖归厤閲嶅懡鍚嶈姹?
		const renameMatch = pathname.match(/^\/api\/docs\/node\/([a-zA-Z0-9-]+)\/rename$/);
		if (renameMatch && request.method === 'POST') {
			const nodeId = renameMatch[1];
			return handleDocsNodeRename(request, nodeId, env);
		}

		// 鍖归厤鎵€鏈?/api/docs/node/:id 鐩稿叧鐨勮姹?
		const nodeDetailMatch = pathname.match(/^\/api\/docs\/node\/([a-zA-Z0-9-]+)$/);
		if (nodeDetailMatch) {
			const nodeId = nodeDetailMatch[1];
			if (request.method === 'GET') {
				return handleDocsNodeGet(request, nodeId, env);
			}
			if (request.method === 'PUT') {
				return handleDocsNodeUpdate(request, nodeId, env);
			}
			if (request.method === 'DELETE') {
				return handleDocsNodeDelete(request, nodeId, env);
			}
			if (request.method === 'PATCH') {
				return handleDocsNodeMove(request, nodeId, env);
			}
		}
	}
	// --- END: 鏇存柊鍚庣殑 Docs API 璺敱 ---

	if (pathname === '/api/settings') {
		if (request.method === 'GET') {
			return handleGetSettings(request, env);
		}
		if (request.method === 'PUT') {
			return handleSetSettings(request, env);
		}
	}
	if (request.method === 'POST' && pathname === '/api/upload/image') {
		return handleStandaloneImageUpload(request, env);
	}
	const imageMatch = pathname.match(/^\/api\/images\/([a-zA-Z0-9-]+)$/);
	if (imageMatch) {
		const imageId = imageMatch[1];
		return handleServeStandaloneImage(imageId, env);
	}
	if (request.method === 'GET' && pathname === '/api/attachments') {
		return handleGetAllAttachments(request, env);
	}
	if (request.method === 'POST' && pathname === '/api/proxy/upload/imgur') {
		return handleImgurProxyUpload(request, env);
	}
	if (pathname === '/api/stats') {
		return handleStatsRequest(request, env);
	}
	if (pathname === '/api/tags') {
		return handleTagsList(request, env);
	}
	const tagDeleteMatch = pathname.match(/^\/api\/tags\/([^\/]+)$/);
	if (request.method === 'DELETE' && tagDeleteMatch) {
		return handleTagDelete(decodeURIComponent(tagDeleteMatch[1]), env);
	}
	const fileMatch = pathname.match(/^\/api\/files\/([^\/]+)\/([^\/]+)$/);
	if (fileMatch) {
		const [, noteId, fileId] = fileMatch;
		return handleFileRequest(noteId, fileId, request, env);
	}
	if (pathname === '/api/notes/timeline') {
		return handleTimelineRequest(request, env);
	}
	if (pathname === '/api/search') {
		return handleSearchRequest(request, env);
	}
	if (pathname === '/api/notes/export') {
		return handleExportNotes(request, env);
	}
	const noteDetailMatch = pathname.match(/^\/api\/notes\/([^\/]+)$/);
	if (noteDetailMatch) {
		const noteId = noteDetailMatch[1];
		return handleNoteDetail(request, noteId, env);
	}

	if (pathname === '/api/notes') {
		return handleNotesList(request, env);
	}
	return new Response('Not Found', { status: 404 });
}

/**
 * 澶勭悊缁熻鏁版嵁璇锋眰
 */
async function handleStatsRequest(request, env) {
	const db = env.DB;
	try {
		const memosCountQuery = db.prepare("SELECT COUNT(*) as total FROM notes WHERE is_archived = '0'");
		const tagsCountQuery = db.prepare("SELECT COUNT(DISTINCT nt.tag_id) as total FROM note_tags nt JOIN notes n ON nt.note_id = n.id WHERE n.is_archived = '0'");
		const oldestNoteQuery = db.prepare("SELECT MIN(updated_at) as oldest_ts FROM notes WHERE is_archived = '0'");

		const [memosResult, tagsResult, oldestNoteResult] = await Promise.all([
			memosCountQuery.first(),
			tagsCountQuery.first(),
			oldestNoteQuery.first()
		]);

		// 鐩存帴杩斿洖鍘熷姣鏃堕棿鎴筹紙鏁板瓧锛夛紝鍓嶇鑷瑙ｆ瀽锛岄伩鍏?D1 exec 杩斿洖鍊兼牸寮忛棶棰樺拰鏃跺尯瑙ｆ瀽姝т箟
		let oldestTs = null;
		const rawTs = oldestNoteResult.oldest_ts;
		if (rawTs !== null) {
			oldestTs = rawTs;
		}

		const stats = {
			memos: memosResult.total || 0,
			tags: tagsResult.total || 0,
			oldestNoteTimestamp: oldestTs
		};
		return jsonResponse(stats);
	} catch (e) {
		console.error("Stats Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * 澶勭悊鏃堕棿绾挎暟鎹姹傦紝杩斿洖鎸?骞?-> 鏈?-> 鏃?缁撴瀯鍖栫殑绗旇鏁伴噺缁熻
 */
async function handleTimelineRequest(request, env) {
	const db = env.DB;
	try {
		const { searchParams } = new URL(request.url);
		const timezone = searchParams.get('timezone') || 'UTC';
		// D1 涓嶇洿鎺ユ敮鎸?strftime 鎴?to_char, 鎴戜滑闇€瑕佽幏鍙栨墍鏈夊垱寤烘椂闂达紝鐒跺悗鍦?JS 涓鐞?
		// 娉ㄦ剰锛氬鏋滅瑪璁版暟閲忓法澶?(鍑犲崄涓囨潯)锛岃繖涓煡璇㈠彲鑳戒細鏈夋€ц兘闂銆?
		// 瀵逛簬鍑犲崈鍒板嚑涓囨潯绗旇锛岃繖鏄畬鍏ㄥ彲浠ユ帴鍙楃殑銆?
		const stmt = db.prepare("SELECT updated_at FROM notes WHERE is_archived = '0' ORDER BY updated_at DESC");
		const { results } = await stmt.all();
		if (!results) {
			return jsonResponse({});
		}
		const timezoneFormatter = new Intl.DateTimeFormat('en-US', { // 'en-US' 鍙槸涓轰簡鏍煎紡锛屼笉褰卞搷缁撴灉
			timeZone: timezone,
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
		});
		// 鍦?JavaScript 涓繘琛屽垎缁勭粺璁?
		const timeline = {};
		for (const note of results) {
			const rawTs = String(note.updated_at).replace(/\.0+$/, "");
			let date;
			// 鍏煎鏁板瓧姣鏃堕棿鎴?/ 鏍囧噯瀛楃涓叉椂闂?
			if (/^\d+$/.test(rawTs)) {
				date = new Date(Number(rawTs));
			} else {
				date = new Date(rawTs);
			}
			// 鏃犳晥鏃堕棿鐩存帴璺宠繃锛屼笉鎶涙暟鎹簱閿欒涓柇鎺ュ彛
			if (isNaN(date.getTime())) continue;
			const parts = timezoneFormatter.formatToParts(date);
			const year = parseInt(parts.find(p => p.type === 'year').value, 10);
			const month = parseInt(parts.find(p => p.type === 'month').value, 10);
			const day = parseInt(parts.find(p => p.type === 'day').value, 10);

			// 鍒濆鍖栧勾
			if (!timeline[year]) {
				timeline[year] = { count: 0, months: {} };
			}
			// 鍒濆鍖栨湀
			if (!timeline[year].months[month]) {
				timeline[year].months[month] = { count: 0, days: {} };
			}
			// 鍒濆鍖栨棩
			if (!timeline[year].months[month].days[day]) {
				timeline[year].months[month].days[day] = { count: 0 };
			}
			// 閫掑璁℃暟
			timeline[year].count++;
			timeline[year].months[month].count++;
			timeline[year].months[month].days[day].count++;
		}
		return jsonResponse(timeline);
	} catch (e) {
		console.error("Timeline Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}
/**
 * 澶勭悊鍏ㄦ枃鎼滅储璇锋眰锛屾敮鎸佸垎椤靛拰鍙犲姞绛涢€夋潯浠?
 */
async function handleSearchRequest(request, env) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get('q');

	// 1. 濡傛灉鎼滅储鏌ヨ涓虹┖鎴栧彧鍖呭惈绌烘牸锛屽垯灏嗚姹傚鎵樼粰 handleNotesList
	if (!query || query.trim().length === 0) {
		// 鐩存帴璋冪敤 handleNotesList 骞惰繑鍥炲叾缁撴灉锛屽疄鐜版棤缂濆洖閫€
		return handleNotesList(request, env);
	}
	// 2. 淇濈暀瀵硅繃鐭煡璇㈢殑妫€鏌?
	if (query.trim().length < 2) {
		return jsonResponse({ notes: [], hasMore: false });
	}

	// --- 寮曞叆鍒嗛〉閫昏緫 ---
	const page = parseInt(searchParams.get('page') || '1');
	const offset = (page - 1) * NOTES_PER_PAGE;
	const limit = NOTES_PER_PAGE;
	const tagName = searchParams.get('tag');
	const startTimestamp = searchParams.get('startTimestamp');
	const endTimestamp = searchParams.get('endTimestamp');
	const isFavoritesMode = searchParams.get('favorites') === 'true';

	const db = env.DB;
	try {
		const sanitized = query.replace(/["*()+\-^]/g, " ").replace(/\s+/g, " ").trim();
		const ftsQuery = sanitized.split(/\s+/).map(w => w + "*").join(" ");
		let whereClauses = ["fts MATCH ?"];
		let bindings = [ftsQuery];
		let joinClause = "";
		if (isFavoritesMode) {
			whereClauses.push("n.is_favorited = '1'");
		}
		if (startTimestamp && endTimestamp) {
			const startMs = parseInt(startTimestamp);
			const endMs = parseInt(endTimestamp);
			if (!isNaN(startMs) && !isNaN(endMs)) {
				whereClauses.push("n.updated_at >= ? AND n.updated_at < ?");
				bindings.push(startMs, endMs);
			}
		}
		if (tagName) {
			joinClause = `
                JOIN note_tags nt ON n.id = nt.note_id
                JOIN tags t ON nt.tag_id = t.id
            `;
			whereClauses.push("t.name = ?");
			bindings.push(tagName);
		}
		const isArchivedMode = searchParams.get('archived') === 'true';
		if (isArchivedMode) {
			whereClauses.push("n.is_archived = '1'");
		} else {
			whereClauses.push("n.is_archived = '0'");
		}

		const whereString = whereClauses.join(" AND ");
		let notes, hasMore;
		try {
			const stmt = db.prepare(`
            SELECT n.* FROM notes n
            JOIN notes_fts fts ON n.id = fts.rowid
            ${joinClause}
            WHERE ${whereString}
            ORDER BY rank
            LIMIT ? OFFSET ?
        `);
			bindings.push(limit + 1, offset);
			const { results: notesPlusOne } = await stmt.bind(...bindings).all();
			hasMore = notesPlusOne.length > limit;
			notes = notesPlusOne.slice(0, limit);
		} catch (ftsError) {
			console.error("FTS5 failed, falling back to LIKE:", ftsError.message);
			const likeBind = ['%' + query + '%'];
			let likeWhere = ["n.content LIKE ?"];
			if (isFavoritesMode) likeWhere.push("n.is_favorited = '1'");
			if (startTimestamp && endTimestamp) {
				const sm = parseInt(startTimestamp);
				const em = parseInt(endTimestamp);
				if (!isNaN(sm) && !isNaN(em)) {
					likeWhere.push("n.updated_at >= ? AND n.updated_at < ?");
					likeBind.push(sm, em);
				}
			}
			if (tagName) {
				likeWhere.push("t.name = ?");
				likeBind.push(tagName);
				joinClause = " JOIN note_tags nt ON n.id = nt.note_id JOIN tags t ON nt.tag_id = t.id ";
			}
			if (isArchivedMode) {
				likeWhere.push("n.is_archived = '1'");
			} else {
				likeWhere.push("n.is_archived = '0'");
			}
			const likeStmt = db.prepare("SELECT n.* FROM notes n " + joinClause + " WHERE " + likeWhere.join(" AND ") + " ORDER BY n.updated_at DESC LIMIT ? OFFSET ?");
			likeBind.push(limit + 1, offset);
			const { results: likeResults } = await likeStmt.bind(...likeBind).all();
			hasMore = likeResults.length > limit;
			notes = likeResults.slice(0, limit);
		}

		notes.forEach(note => {
			if (typeof note.files === 'string') {
				try { note.files = JSON.parse(note.files); } catch (e) { note.files = []; }
			}
		});
		return jsonResponse({ notes, hasMore });
	} catch (e) {
		console.error("Search Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * 鑾峰彇鎵€鏈夋爣绛惧強鍏朵娇鐢ㄦ鏁?
 */
async function handleTagsList(request, env) {
	const db = env.DB;
	try {
		// 浣跨敤 LEFT JOIN 鍜?COUNT 鏉ョ粺璁℃瘡涓爣绛惧叧鑱旂殑绗旇鏁伴噺
		// ORDER BY count DESC, name ASC 瀹炵幇浜嗘寜鏁伴噺闄嶅簭銆佸悕绉板崌搴忕殑鎺掑簭
		const stmt = db.prepare(`
            SELECT t.name, COUNT(nt.note_id) as count
            FROM tags t
            LEFT JOIN note_tags nt ON t.id = nt.tag_id
            GROUP BY t.id, t.name
            HAVING count > 0 -- 鍙繑鍥炶浣跨敤杩囩殑鏍囩
            ORDER BY count DESC, t.name ASC
        `);
		const { results } = await stmt.all();
		return jsonResponse(results);
	} catch (e) {
		console.error("Tags List Error:", e.message);
		return jsonResponse({ error: 'Database Error' }, 500);
	}
}

async function handleTagDelete(tagName, env) {
	const db = env.DB;
	try {
		const { meta } = await db.prepare("DELETE FROM tags WHERE name = ?").bind(tagName).run();
		if (meta.changes === 0) {
			return jsonResponse({ error: 'Tag not found' }, 404);
		}
		return jsonResponse({ success: true });
	} catch (e) {
		console.error("Tag Delete Error:", e.message);
		return jsonResponse({ error: 'Database Error' }, 500);
	}
}

/**
 * 妫€鏌?Session Cookie 鏄惁鏈夋晥
 */
async function isSessionAuthenticated(request, env) {
	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader || !cookieHeader.includes(SESSION_COOKIE)) {
		return null;
	}
	const cookies = cookieHeader.split(';').map(c => c.trim());
	const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE}=`));
	if (!sessionCookie) return null;
	const sessionId = sessionCookie.split('=')[1];
	if (!sessionId) return null;
	const session = await env.NOTES_KV.get(`session:${sessionId}`, 'json');
	return session || null;
}

/**
 * 澶勭悊鐧诲綍璇锋眰
 */
async function handleLogin(request, env) {
	try {
		const { username, password } = await request.json();
		if (username === env.USERNAME && password === env.PASSWORD) {
			const sessionId = crypto.randomUUID();
			const sessionData = { username, loggedInAt: Date.now() };
			await env.NOTES_KV.put(`session:${sessionId}`, JSON.stringify(sessionData), {
				expirationTtl: SESSION_DURATION_SECONDS,
			});
			const headers = new Headers();
			headers.append('Set-Cookie', `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}`);
			return jsonResponse({ success: true }, 200, headers);
		}
	} catch (e) {
		console.error("Login Error:", e.message);
	}
	return jsonResponse({ error: 'Invalid credentials' }, 401);
}

/**
 * 澶勭悊閫€鍑虹櫥褰曡姹?
 */
async function handleLogout(request, env) {
	const cookieHeader = request.headers.get('Cookie');
	if (cookieHeader && cookieHeader.includes(SESSION_COOKIE)) {
		const sessionId = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
		if (sessionId) {
			await env.NOTES_KV.delete(`session:${sessionId}`);
		}
	}
	const headers = new Headers();
	headers.append('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
	return jsonResponse({ success: true }, 200, headers);
}

/**
 * 浠?KV 涓幏鍙栫敤鎴疯缃€傚鏋?KV 涓病鏈夛紝鍒欒繑鍥為粯璁ゅ€笺€?
 */
async function handleGetSettings(request, env) {
	const defaultSettings = {
		showSearchBar: true,
		showStatsCard: true,
		showCalendar: true,
		showTags: true,
		showTimeline: true,
		showRightSidebar: true,
		hideEditorInWaterfall: false,
		showHeatmap: true, // 榛樿鏄剧ず鐑姏鍥?
		imageUploadDestination: 'local', // 榛樿浣跨敤R2
		imgurClientId: '',
		surfaceColor: '#ffffff',
		surfaceColorDark: '#151f31',
		surfaceOpacity: 1,
		backgroundOpacity: 1, // 榛樿瀹屽叏涓嶉€忔槑
		backgroundImage: '/bg.jpg',
		backgroundBlur: 0,
		waterfallCardWidth: 320,
		enableDateGrouping: false,
		telegramProxy: false,
		showFavorites: true,  // 鎺у埗鏀惰棌澶?
		showArchive: true,      // 鎺у埗褰掓。
		enablePinning: true,    // 鎺у埗缃《鍔熻兘
		enableSharing: true,    // 鎺у埗鍒嗕韩鍔熻兘
		showDocs: true,          // 鎺у埗 Docs 閾炬帴
		enableContentTruncation: false,
	};

	let savedSettings = await env.NOTES_KV.get('user_settings', 'json');

	// 濡傛灉 KV 涓病鏈夎缃紝鍒欒繑鍥為粯璁ゅ€?
	if (!savedSettings) {
		return jsonResponse(defaultSettings);
	}
	return jsonResponse(savedSettings);
}

/**
 * 灏嗙敤鎴疯缃繚瀛樺埌 KV 涓€?
 */
async function handleSetSettings(request, env) {
	try {
		const settingsToSave = await request.json();
		await env.NOTES_KV.put('user_settings', JSON.stringify(settingsToSave));
		return jsonResponse({ success: true });
	} catch (e) {
		console.error("Set Settings Error:", e.message);
		return jsonResponse({ error: 'Failed to save settings' }, 500);
	}
}

/**
 * 澶勭悊绗旇鍒楄〃鐨?GET 鍜?POST
 */
async function handleExportNotes(request, env) {
	const db = env.DB;
	try {
		const stmt = db.prepare("SELECT * FROM notes WHERE is_archived = '0' ORDER BY updated_at DESC");
		const { results } = await stmt.all();
		// 清理敏感数据并转换文件字段
		results.forEach(note => {
			if (typeof note.files === 'string') {
				try { note.files = JSON.parse(note.files); } catch (e) { note.files = []; }
			}
		});
		return new Response(JSON.stringify({ notes: results, exportedAt: Date.now() }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		console.error("Export Error:", e.message);
		return new Response(JSON.stringify({ error: 'Database Error' }), { status: 500 });
	}
}
async function handleNotesList(request, env) {
	const db = env.DB;

	try {
		switch (request.method) {
			case 'GET': {
				const url = new URL(request.url);
				const page = parseInt(url.searchParams.get('page') || '1');
				const offset = (page - 1) * NOTES_PER_PAGE;
				const limit = NOTES_PER_PAGE;

				const startTimestamp = url.searchParams.get('startTimestamp');
				const endTimestamp = url.searchParams.get('endTimestamp');
				const tagName = url.searchParams.get('tag');
				const isFavoritesMode = url.searchParams.get('favorites') === 'true';
				const isArchivedMode = url.searchParams.get('archived') === 'true';

				let whereClauses = [];
				let bindings = [];
				let joinClause = "";

				if (isArchivedMode) {
					whereClauses.push("n.is_archived = '1'");
				} else {
					// 榛樿锛堝寘鎷敹钘忓す锛夐兘搴旇鎺掗櫎宸插綊妗ｇ殑
					whereClauses.push("n.is_archived = '0'");
				}

				if (startTimestamp && endTimestamp) {
					// 灏嗗瓧绗︿覆鏃堕棿鎴宠浆鎹负鏁板瓧
					const startMs = parseInt(startTimestamp);
					const endMs = parseInt(endTimestamp);

					if (!isNaN(startMs) && !isNaN(endMs)) {
						whereClauses.push("updated_at >= ? AND updated_at < ?");
						bindings.push(startMs, endMs);
					}
				}
				if (tagName) {
					joinClause = `
                    JOIN note_tags nt ON n.id = nt.note_id
                    JOIN tags t ON nt.tag_id = t.id
                `;
					whereClauses.push("t.name = ?");
					bindings.push(tagName);
				}
				if (isFavoritesMode) {
					whereClauses.push("n.is_favorited = '1'");
				}
				const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

				const query = `
                SELECT n.* FROM notes n
                ${joinClause}
                ${whereClause}
                ORDER BY n.is_pinned DESC, n.updated_at DESC
                LIMIT ? OFFSET ?
            `;

				// 灏嗗垎椤靛弬鏁版坊鍔犲埌 bindings 鏁扮粍鐨勬湯灏?
				bindings.push(limit + 1, offset);

				const notesStmt = db.prepare(query);
				const { results: notesPlusOne } = await notesStmt.bind(...bindings).all();

				const hasMore = notesPlusOne.length > limit;
				const notes = notesPlusOne.slice(0, limit);

				notes.forEach(note => {
					if (typeof note.files === 'string') {
						try { note.files = JSON.parse(note.files); } catch (e) { note.files = []; }
					}
				});

				return jsonResponse({ notes, hasMore });
			}

			case 'POST': {
				const formData = await request.formData();
				const content = formData.get('content')?.toString() || '';
				const files = formData.getAll('file');

				if (!content.trim() && files.every(f => !f.name)) {
					return jsonResponse({ error: 'Content or file is required.' }, 400);
				}

				const now = Date.now();
				const filesMeta = [];

				// 銆愭牳蹇冧慨鏀广€戝湪鎻掑叆鏁版嵁搴撳墠锛屽厛鎻愬彇鍥剧墖 URL
				const picUrls = extractImageUrls(content);
				const videoUrls = [];

				// 銆愭牳蹇冧慨鏀广€戝湪 INSERT 璇彞涓姞鍏ユ柊鐨?pics 瀛楁
				const insertStmt = db.prepare(
					"INSERT INTO notes (content, files, is_pinned, created_at, updated_at, pics, videos) VALUES (?, ?, 0, ?, ?, ?, ?) RETURNING id"
				);
				// 鍏堢敤涓€涓┖鐨?files 鏁扮粍鎻掑叆
				// 銆愭牳蹇冧慨鏀广€戝皢鎻愬彇鍑虹殑 picUrls 缁戝畾鍒?SQL 璇彞涓?
				const { id: noteId } = await insertStmt.bind(content, "[]", now, now, picUrls, "[]").first();
				if (!noteId) {
					throw new Error("Failed to create note and get ID.");
				}

				// --- 銆愰噸瑕侀€昏緫璋冩暣銆戠幇鍦ㄤ笂浼犵殑鏂囦欢锛屽彧鏈夐潪鍥剧墖绫诲瀷鎵嶇畻浣?"闄勪欢" (files) ---
				for (const file of files) {
					if (file.name && file.size > 0 && !file.type.startsWith('image/')) {
						const fileId = crypto.randomUUID();
						await env.NOTES_R2_BUCKET.put(`${noteId}/${fileId}`, file.stream());
						if (file.type.startsWith('video/')) {
							videoUrls.push(`/api/files/${noteId}/${fileId}`);
						} else {
							filesMeta.push({ id: fileId, name: file.name, size: file.size, type: file.type });
						}
					}
				}
				// 濡傛灉鏈夐潪鍥剧墖闄勪欢锛屽啀鏇存柊鏁版嵁搴撲腑鐨?files 瀛楁
				if (filesMeta.length > 0) {
					const updateFilesStmt = db.prepare("UPDATE notes SET files = ? WHERE id = ?");
					await updateFilesStmt.bind(JSON.stringify(filesMeta), noteId).run();
				}
					if (videoUrls.length > 0) {
						const updateVideosStmt = db.prepare("UPDATE notes SET videos = ? WHERE id = ?");
						await updateVideosStmt.bind(JSON.stringify(videoUrls), noteId).run();
					}

				await processNoteTags(db, noteId, content);
				// 鑾峰彇瀹屾暣鐨勭瑪璁拌繑鍥炵粰鍓嶇
				const newNote = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(noteId).first();
				if (typeof newNote.files === 'string') {
					newNote.files = JSON.parse(newNote.files);
				}

				return jsonResponse(newNote, 201);
			}
		}
	} catch (e) {
		console.error("D1 Error:", e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * 澶勭悊鍗曟潯绗旇鐨?PUT 鍜?DELETE
 */
async function handleNoteDetail(request, noteId, env) {
	const db = env.DB;
	const id = parseInt(noteId);
	if (isNaN(id)) {
		return new Response('Invalid Note ID', { status: 400 });
	}

	try {
		// 棣栧厛鑾峰彇鐜版湁绗旇锛岀敤浜庢枃浠跺垹闄ゅ拰杩斿洖鏁版嵁
		let existingNote = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
		if (!existingNote) {
			return new Response('Not Found', { status: 404 });
		}
		// 纭繚 files 瀛楁鏄暟缁?
		try {
			if (typeof existingNote.files === 'string') {
				existingNote.files = JSON.parse(existingNote.files);
			}
		} catch(e) {
			existingNote.files = [];
		}

		switch (request.method) {
			case 'PUT': {
				const formData = await request.formData();
				const shouldUpdateTimestamp = formData.get('update_timestamp') !== 'false';

				if (formData.has('content')) {
					let content = formData.get('content')?.toString() ?? existingNote.content;
					let currentFiles = existingNote.files;

					// --- 鐜板湪鐨勬枃浠跺鐞嗗彧鍏冲績闈炲浘鐗囬檮浠?---
					// 澶勭悊闄勪欢鍒犻櫎 (閫昏緫涓嶅彉锛屽洜涓哄畠鎿嶄綔鐨勬槸 files 瀛楁)
					const filesToDelete = JSON.parse(formData.get('filesToDelete') || '[]');
					if (filesToDelete.length > 0) {
						const r2KeysToDelete = filesToDelete.map(fileId => `${id}/${fileId}`);
						await env.NOTES_R2_BUCKET.delete(r2KeysToDelete);
						currentFiles = currentFiles.filter(file => !filesToDelete.includes(file.id));
					}

					// 澶勭悊浠?pics 涓垹闄ゅ浘鐗囷紙鐙珛涓婁紶鐨勫浘鐗囷紝闈炴枃浠堕檮浠讹級
					const picsToRemove = JSON.parse(formData.get('picsToRemove') || '[]');
					if (picsToRemove.length > 0) {
						const r2ImageKeys = picsToRemove.map(url => {
							const m = url.match(/^\/api\/images\/([a-zA-Z0-9-]+)$/);
							return m ? `uploads/${m[1]}` : null;
						}).filter(Boolean);
						if (r2ImageKeys.length > 0) {
							await env.NOTES_R2_BUCKET.delete(r2ImageKeys);
						}
						// 浠?content 涓Щ闄ゅ搴旂殑 markdown 鍥剧墖寮曠敤
						for (const url of picsToRemove) {
							const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
							content = content.replace(new RegExp(`!\[.*?\]\(\s*${escaped}\s*\)`, 'g'), '');
						}
					}

					// 鍦ㄥ鐞嗗畬鏂囦欢鍒犻櫎鍚庯紝妫€鏌ョ瑪璁版槸鍚﹀簲璇ヨ鍒犻櫎
					const hasNewFiles = formData.getAll('file').some(f => f.name && f.size > 0);
					if (content.trim() === '' && currentFiles.length === 0 && !hasNewFiles) {
						// 绗旇鍗冲皢鍙樼┖锛屾墽琛屽垹闄ゆ搷浣?
						// 1. 鍒犻櫎 R2 涓殑鎵€鏈夊墿浣欐枃浠讹紙濡傛灉鏈夌殑璇濓紝铏界劧閫昏緫涓婅繖閲?currentFiles 搴旇鏄┖鐨勶級
						const allR2Keys = existingNote.files.map(file => `${id}/${file.id}`);
						if (allR2Keys.length > 0) {
							await env.NOTES_R2_BUCKET.delete(allR2Keys);
						}
						// 2. 浠庢暟鎹簱鍒犻櫎绗旇
						await db.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
						// 3. 杩斿洖鐗规畩鏍囪锛屽憡鐭ュ墠绔暣涓瑪璁板凡琚垹闄?
						return jsonResponse({ success: true, noteDeleted: true });
					}
					// 澶勭悊鏂伴檮浠朵笂浼?
					const newFiles = formData.getAll('file');
					const videoUrls = [];
					for (const file of newFiles) {
						if (file.name && file.size > 0 && !file.type.startsWith('image/')) {
							const fileId = crypto.randomUUID();
							await env.NOTES_R2_BUCKET.put(`${id}/${fileId}`, file.stream());
							if (file.type.startsWith('video/')) {
								videoUrls.push(`/api/files/${id}/${fileId}`);
							} else {
								currentFiles.push({ id: fileId, name: file.name, size: file.size, type: file.type });
							}
						}
					}

					// 鍦ㄦ洿鏂版暟鎹簱鍓嶏紝鎻愬彇鏂扮殑鍥剧墖 URL 鍒楄〃
					const picUrls = extractImageUrls(content);
					const newTimestamp = shouldUpdateTimestamp ? Date.now() : existingNote.updated_at;
					// 鍦?UPDATE 璇彞涓姞鍏?pics 瀛楁鐨勬洿鏂?
					const stmt = db.prepare(
						"UPDATE notes SET content = ?, files = ?, updated_at = ?, pics = ?, videos = ? WHERE id = ?"
					);
					const existingVideos = (() => { try { return JSON.parse(existingNote.videos || '[]'); } catch(e) { return []; } })();
					const allVideos = [...existingVideos, ...videoUrls];
					await stmt.bind(content, JSON.stringify(currentFiles), newTimestamp, picUrls, JSON.stringify(allVideos), id).run();
					await processNoteTags(db, id, content);
				}

				if (formData.has('isPinned')) { // --- 杩欐槸缃《鐘舵€佺殑鏇存柊 ---
					const isPinned = formData.get('isPinned') === 'true' ? '1' : '0';
					const stmt = db.prepare("UPDATE notes SET is_pinned = ? WHERE id = ?");
					await stmt.bind(isPinned, id).run();
				}
				if (formData.has('isFavorited')) {
					const isFavorited = formData.get('isFavorited') === 'true' ? '1' : '0';
					const stmt = db.prepare("UPDATE notes SET is_favorited = ? WHERE id = ?");
					await stmt.bind(isFavorited, id).run();
				}
				if (formData.has('is_archived')) {
					const isArchived = formData.get('is_archived') === 'true' ? '1' : '0';
					const stmt = db.prepare("UPDATE notes SET is_archived = ? WHERE id = ?");
					await stmt.bind(isArchived, id).run();
				}

				const updatedNote = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
				if (typeof updatedNote.files === 'string') {
					updatedNote.files = JSON.parse(updatedNote.files);
				}
				return jsonResponse(updatedNote);
			}

			case 'DELETE': {
				let allR2KeysToDelete = [];

				if (existingNote.files && existingNote.files.length > 0) {
					const attachmentKeys = existingNote.files
						.filter(file => file.id)
						.map(file => `${id}/${file.id}`);
					allR2KeysToDelete.push(...attachmentKeys);
				}
				let picUrls = [];
				if (typeof existingNote.pics === 'string') {
					try { picUrls = JSON.parse(existingNote.pics); } catch (e) { }
				}

				if (picUrls.length > 0) {
					const imageKeys = picUrls.map(url => {
						const imageMatch = url.match(/^\/api\/images\/([a-zA-Z0-9-]+)$/);
						if (imageMatch) {
							return `uploads/${imageMatch[1]}`;
						}
						const fileMatch = url.match(/^\/api\/files\/\d+\/([a-zA-Z0-9-]+)$/);
						if (fileMatch) {
							return `${id}/${fileMatch[1]}`;
						}
						return null;
					}).filter(key => key !== null);

					allR2KeysToDelete.push(...imageKeys);
				}

				if (allR2KeysToDelete.length > 0) {
					await env.NOTES_R2_BUCKET.delete(allR2KeysToDelete);
				}

				await db.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();

				return new Response(null, { status: 204 });
			}
		}
	} catch (e) {
		console.error("D1 Error:", e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

async function handleFileRequest(noteId, fileId, request, env) {
	const db = env.DB;
	const id = parseInt(noteId);
	if (isNaN(id)) {
		return new Response('Invalid Note ID', { status: 400 });
	}

	// 灏濊瘯浠庢暟鎹簱鑾峰彇鍏冩暟鎹?
	const note = await db.prepare("SELECT files FROM notes WHERE id = ?").bind(id).first();

	// 銆愭牳蹇冧慨鏀广€戝嵆浣?note 涓嶅瓨鍦ㄦ垨 files 涓虹┖锛屾垜浠篃涓嶇珛鍗宠繑鍥?404锛?
	// 鍥犱负鍥剧墖鍙兘鍙褰曞湪 pics 瀛楁涓€?

	let files = [];
	if (note && typeof note.files === 'string') {
		try {
			files = JSON.parse(note.files);
		} catch (e) {
			// JSON 瑙ｆ瀽澶辫触鍒欏拷鐣?
		}
	}

	const fileMeta = files.find(f => f.id === fileId);

	// 灏濊瘯浠?R2 鑾峰彇鏂囦欢瀵硅薄
	const object = await env.NOTES_R2_BUCKET.get(`${id}/${fileId}`);
	if (object === null) {
		// 濡傛灉 R2 涓‘瀹炴病鏈夎繖涓枃浠讹紝鎵嶈繑鍥?404
		return new Response('File not found in storage', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers); // 浠?R2 瀵硅薄涓啓鍏ュ厓鏁版嵁锛堝 Content-Type锛?
	headers.set('etag', object.httpEtag);
	headers.set('Cache-Control', 'public, max-age=86400, immutable');

	// --- 鏍规嵁鏄惁瀛樺湪 fileMeta 鏉ュ喅瀹氬浣曡缃?headers ---
	if (fileMeta) {
		// 銆愭儏鍐典竴锛氬厓鏁版嵁瀛樺湪銆戣繖鏄爣鍑嗘枃浠舵垨鏃х殑鍥剧墖锛屾寜鍘熼€昏緫澶勭悊
		const contentType = fileMeta.type || 'application/octet-stream';
		const fileExtension = fileMeta.name.split('.').pop().toLowerCase();
		const textLikeExtensions = ['yml', 'yaml', 'md', 'log', 'toml', 'sh', 'py', 'js', 'json', 'css', 'html'];

		if (contentType.startsWith('text/') || textLikeExtensions.includes(fileExtension)) {
			headers.set('Content-Type', 'text/plain; charset=utf-8');
		} else {
			headers.set('Content-Type', contentType);
		}

		const isPreview = new URL(request.url).searchParams.get('preview') === 'true';
		const disposition = isPreview ? 'inline' : 'attachment';
		headers.set('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileMeta.name)}"`);
	} else {
		// 銆愭儏鍐典簩锛氬厓鏁版嵁涓嶅瓨鍦ㄣ€戣繖鏄柊鐨?Telegram 鍥剧墖锛屾垜浠彧纭繚瀹冭兘琚祻瑙堝櫒姝ｇ‘鏄剧ず
		// Content-Type 宸茬粡閫氳繃 object.writeHttpMetadata(headers) 浠?R2 涓缃ソ浜嗭紝
		// 杩欓€氬父瓒冲璁╂祻瑙堝櫒姝ｇ‘娓叉煋鍥剧墖銆?
		// 鎴戜滑灏嗗叾璁剧疆涓?inline锛岀‘淇濆畠鍦?<img> 鏍囩涓兘鏄剧ず鑰屼笉鏄涓嬭浇銆?
		headers.set('Content-Disposition', 'inline');
	}

	return new Response(object.body, { headers });
}
/**
 *  灏?Telegram 鐨勬牸寮忓寲瀹炰綋 (entities) 杞崲涓?Markdown 鏂囨湰
 *
 * @param {string} text 鍘熷鏂囨湰
 * @param {Array<object>} entities 浠?Telegram API 鏀跺埌鐨勬爣绛炬暟缁勩€?
 * @returns {string} 鏍煎紡鍖栧悗鐨勩€侀珮搴﹀吋瀹圭殑 Markdown 鏂囨湰銆?
 */
function telegramEntitiesToMarkdown(text, entities = []) {
	if (!entities || entities.length === 0) {
		return text;
	}

	// 浼樺厛绾у喅瀹氫簡鏍囩鐨勫祵濂楅『搴忋€傛暟瀛楄秺灏忥紝瓒婂湪澶栧眰銆?
	const tagPriority = {
		'text_link': 10,
		'bold': 20,
		'italic': 30, // 浣跨敤 _ 浣滀负鏂滀綋鏍囪锛岄伩鍏嶄笌 ** 鐨?* 鍐茬獊
		'underline': 40,
		'strikethrough': 50,
		'spoiler': 60,
		'code': 70,
		'pre': 80
	};
	const mods = Array.from({ length: text.length + 1 }, () => ({ openTags: [], closeTags: [] }));
	entities.forEach(entity => {
		const { type, offset, length, url, language } = entity;
		const endOffset = offset + length;
		const priority = tagPriority[type] || 100;
		let startTag = '', endTag = '';
		switch (type) {
			case 'bold':          startTag = '**'; endTag = '**'; break;
			case 'italic':        startTag = '_';  endTag = '_';  break;
			case 'underline':     startTag = '__'; endTag = '__'; break;
			case 'strikethrough': startTag = '~~'; endTag = '~~'; break;
			case 'spoiler':       startTag = '||'; endTag = '||'; break;
			case 'code':          startTag = '`';  endTag = '`';  break;
			case 'text_link':
				startTag = '[';
				const encodedUrl = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
				endTag = `](${encodedUrl})`;
				break;
			case 'pre':
				startTag = `\`\`\`${language || ''}\n`; endTag = '\n```'; break;
		}

		if (startTag) {
			mods[offset].openTags.push({ tag: startTag, priority });
			mods[endOffset].closeTags.push({ tag: endTag, priority });
		}
	});

	let result = '';
	let lastIndex = 0;
	const adjacentSensitiveTags = ['**', '_', '__', '~~', '||', '`'];

	for (let i = 0; i <= text.length; i++) {
		const mod = mods[i];
		if (mod.openTags.length === 0 && mod.closeTags.length === 0) {
			continue;
		}
		result += text.substring(lastIndex, i);
		//   - 闂悎鏍囩鎸変紭鍏堢骇浠庨珮鍒颁綆锛堝唴灞傚厛鍏筹級
		//   - 璧峰鏍囩鎸変紭鍏堢骇浠庝綆鍒伴珮锛堝灞傚厛寮€锛?
		const closeTags = mod.closeTags.sort((a, b) => b.priority - a.priority);
		const openTags = mod.openTags.sort((a, b) => a.priority - b.priority);

		closeTags.forEach(({ tag }) => {
			if (adjacentSensitiveTags.includes(tag) && result.endsWith(tag)) {
				result += '\u200B'; // 鎻掑叆闆跺搴︾┖鏍?
			}
			result += tag;
		});

		openTags.forEach(({ tag }) => {
			if (adjacentSensitiveTags.includes(tag) && result.endsWith(tag)) {
				result += '\u200B'; // 鎻掑叆闆跺搴︾┖鏍?
			}
			result += tag;
		});

		lastIndex = i;
	}

	if (lastIndex < text.length) {
		result += text.substring(lastIndex);
	}
	result = result.replace(
		/\*\*((?:(?:\p{Emoji}|\p{Emoji_Component})+))\*\*/gu,
		'$1'
	);
	result = result.replace(/\*\*(\s+)\*\*/g, '$1');
	result = result.replace(/\*\*(\s+)(.*?)\*\*/g, '$1**$2**');
	return result;
}

/**
 * 浠ｇ悊 Telegram 濯掍綋鏂囦欢璇锋眰銆?
 * 鎺ユ敹涓€涓?file_id锛屽疄鏃惰幏鍙栦复鏃朵笅杞介摼鎺ュ苟閲嶅畾鍚戠敤鎴枫€?
 */
async function handleTelegramProxy(request, env) {
	const { pathname } = new URL(request.url);
	const match = pathname.match(/^\/api\/tg-media-proxy\/([^\/]+)$/);

	if (!match || !match[1]) {
		return new Response('Invalid file_id', { status: 400 });
	}

	const fileId = match[1];
	const botToken = env.TELEGRAM_BOT_TOKEN;

	if (!botToken) {
		console.error("TELEGRAM_BOT_TOKEN secret is not set.");
		return new Response('Bot not configured', { status: 500 });
	}

	try {
		// 1. 璋冪敤 getFile API
		const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
		const fileInfoRes = await fetch(getFileUrl);
		const fileInfo = await fileInfoRes.json();

		if (!fileInfo.ok) {
			console.error(`Telegram getFile API error for file_id ${fileId}:`, fileInfo.description);
			return new Response(`Telegram API error: ${fileInfo.description}`, { status: 502 }); // 502 Bad Gateway
		}

		// 2. 鏋勫缓涓存椂鐨勪笅杞介摼鎺?
		const temporaryDownloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;

		// 3. 杩斿洖 302 閲嶅畾鍚?
		return Response.redirect(temporaryDownloadUrl, 302);

	} catch (e) {
		console.error("Telegram Proxy Error:", e.message);
		return new Response('Failed to proxy Telegram media', { status: 500 });
	}
}

/**
 * - 澶勭悊鏉ヨ嚜 Telegram Bot 鐨?Webhook 璇锋眰
 * - 瑙嗛锛氫繚瀛?file_id锛屽苟鍦ㄦ鏂囦腑宓屽叆鎸囧悜 Worker 浠ｇ悊鐨勯摼鎺ワ紝瀹炵幇鍔ㄦ€佹挱鏀俱€?
 * - 鍥剧墖/鏂囦欢锛氫粛鐒朵簩娆′笂浼犲埌 R2锛屼繚璇佹案涔呭彲鐢ㄣ€?
 */
async function handleTelegramWebhook(request, env, secret) {
	if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
		return new Response('Unauthorized', { status: 401 });
	}
	let chatId = null;
	const botToken = env.TELEGRAM_BOT_TOKEN;
	try {
		const update = await request.json();
		const message = update.message || update.channel_post;
		if (!message) {
			return new Response('OK', { status: 200 });
		}

		const authorizedIdsStr = env.AUTHORIZED_TELEGRAM_IDS;
		if (!authorizedIdsStr) {
			console.error("瀹夊叏璀﹀憡锛欰UTHORIZED_TELEGRAM_IDS 鐜鍙橀噺鏈缃€?);
			return new Response('OK', { status: 200 });
		}
		chatId = message.chat.id;
		const senderId = message.from?.id;
		if (!senderId || authorizedIdsStr != senderId.toString()) {
			console.log(`宸查樆姝㈡潵鑷湭鎺堟潈鎴栨湭鐭ョ敤鎴?${senderId || ''} 鐨勮姹傘€俙);
			return new Response('OK', { status: 200 });
		}

		const db = env.DB;
		const bucket = env.NOTES_R2_BUCKET;
		if (!botToken) {
			console.error("TELEGRAM_BOT_TOKEN secret is not set.");
			return new Response('Bot not configured', { status: 500 });
		}

		const text = message.text || message.caption || '';
		const entities = message.entities || message.caption_entities || [];
		const contentFromTelegram = telegramEntitiesToMarkdown(text, entities);

		let forwardInfo = '';
		if (message.forward_from_chat) {
			const chat = message.forward_from_chat;
			const title = chat.title || 'a channel';
			if (chat.username) {
				const channelUrl = `https://t.me/${chat.username}`;
				forwardInfo = `*Forwarded from [${title}](${channelUrl})*`;
			} else {
				forwardInfo = `*Forwarded from ${title}*`;
			}
		} else if (message.forward_from) {
			const fromName = `${message.forward_from.first_name || ''} ${message.forward_from.last_name || ''}`.trim();
			forwardInfo = `*Forwarded from ${fromName}*`;
		}

		let replyMarkdown = '';
		if (message.reply_to_message) {
			const originalMessage = message.reply_to_message;
			const originalText = originalMessage.text || originalMessage.caption || '';
			const originalEntities = originalMessage.entities || originalMessage.caption_entities || [];
			const originalContentMarkdown = telegramEntitiesToMarkdown(originalText, originalEntities);
			if (originalContentMarkdown.trim()) {
				replyMarkdown = originalContentMarkdown.trim().split('\n').map(line => `> ${line}`).join('\n');
			}
		}

		const photo = message.photo ? message.photo[message.photo.length - 1] : null;
		const document = message.document;
		const video = message.video;

		if (!contentFromTelegram.trim() && !photo && !document && !video) {
			return new Response('OK', { status: 200 });
		}
		const defaultSettings = { telegramProxy: false };
		let userSettings = await env.NOTES_KV.get('user_settings', 'json');
		if (!userSettings) {
			userSettings = defaultSettings;
		}
		const settings = { ...defaultSettings, ...userSettings };
		const now = Date.now();
		let filesMeta = [];
		let picObjects = [];
		let videoObjects = [];
		let mediaEmbeds = [];

		const insertStmt = db.prepare("INSERT INTO notes (content, files, is_pinned, created_at, updated_at, pics, videos) VALUES (?, ?, 0, ?, ?, ?, ?) RETURNING id");
		const { id: noteId } = await insertStmt.bind('', '[]', now, now, '[]', '[]').first();
		if (!noteId) {
			throw new Error("鏃犳硶鍦ㄦ暟鎹簱涓垱寤虹瑪璁拌褰曘€?);
		}

		// 鍥剧墖澶勭悊锛堜繚鎸佷簩娆′笂浼狅級
		if (photo) {
			const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${photo.file_id}`;
			const fileInfoRes = await fetch(getFileUrl);
			const fileInfo = await fileInfoRes.json();
			if (!fileInfo.ok) throw new Error(`Telegram getFile API 閿欒 (photo): ${fileInfo.description}`);
			const filePath = fileInfo.result.file_path;
			const fileName = `photo_${message.message_id}.${(filePath.split('.').pop() || 'jpg')}`;
			const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
			const fileRes = await fetch(downloadUrl);
			if (!fileRes.ok) throw new Error("浠?Telegram 涓嬭浇鍥剧墖澶辫触銆?);
			const fileId = crypto.randomUUID();
			await bucket.put(`${noteId}/${fileId}`, fileRes.body);
			const internalFileUrl = `/api/files/${noteId}/${fileId}`;

			picObjects.push(internalFileUrl); // 涓轰簡鍏煎鎬э紝鍥剧墖鐩存帴瀛?URL 瀛楃涓?
			mediaEmbeds.push(`![${fileName}](${internalFileUrl})`);
		}

		if (video) {
			if (settings.telegramProxy) {
				// --- 浠ｇ悊妯″紡 ---
				const proxyUrl = `/api/tg-media-proxy/${video.file_id}`;
				videoObjects.push(proxyUrl);
				mediaEmbeds.push(`<video src="${proxyUrl}" width="100%" controls muted></video>`);
			} else {
				// --- 浜屾涓婁紶妯″紡 ---
				const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${video.file_id}`;
				const fileInfoRes = await fetch(getFileUrl);
				const fileInfo = await fileInfoRes.json();
				if (!fileInfo.ok) throw new Error(`Telegram getFile API 閿欒 (video): ${fileInfo.description}`);
				const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
				const fileRes = await fetch(downloadUrl);
				if (!fileRes.ok) throw new Error("浠?Telegram 涓嬭浇瑙嗛澶辫触銆?);
				const fileId = crypto.randomUUID();
				await bucket.put(`${noteId}/${fileId}`, fileRes.body);
				const internalFileUrl = `/api/files/${noteId}/${fileId}`;
				videoObjects.push(internalFileUrl);
				mediaEmbeds.push(`<video src="${internalFileUrl}" width="100%" controls muted></video>`);
			}
		}

		// 鏂囦欢澶勭悊锛堟牴鎹缃喅瀹氭ā寮忥級
		if (document) {
			if (settings.telegramProxy) {
				// --- 浠ｇ悊妯″紡 ---
				// 娉ㄦ剰锛氫唬鐞嗘枃浠舵椂锛屾垜浠棤娉曞湪绗旇涓洿鎺ュ睍绀哄畠锛屽彧鑳藉瓨涓€涓厓淇℃伅
				filesMeta.push({
					type: 'telegram_document', // 鐗规畩绫诲瀷
					file_id: document.file_id,
					name: document.file_name,
					size: document.file_size
				});
				// 鍙互鍦ㄦ鏂囧姞涓€涓崰浣嶇锛屼絾杩欓渶瑕佸墠绔敮鎸佹覆鏌?
				// finalContent += `\n\n[Proxy File: ${document.file_name}]`;
			} else {
				// --- 浜屾涓婁紶妯″紡 ---
				const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${document.file_id}`;
				const fileInfoRes = await fetch(getFileUrl);
				const fileInfo = await fileInfoRes.json();
				if (!fileInfo.ok) throw new Error(`Telegram getFile API 閿欒 (document): ${fileInfo.description}`);
				const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
				const fileRes = await fetch(downloadUrl);
				if (!fileRes.ok) throw new Error("浠?Telegram 涓嬭浇鏂囦欢澶辫触銆?);
				const fileId = crypto.randomUUID();
				await bucket.put(`${noteId}/${fileId}`, fileRes.body);
				filesMeta.push({
					id: fileId,
					name: document.file_name,
					size: document.file_size,
					type: document.mime_type || 'application/octet-stream'
				});
			}
		}

		const contentParts = [];
		if (forwardInfo) contentParts.push(forwardInfo);
		if (mediaEmbeds.length > 0) contentParts.push(mediaEmbeds.join('\n'));
		if (replyMarkdown) contentParts.push(replyMarkdown);
		if (contentFromTelegram.trim()) contentParts.push(contentFromTelegram.trim());

		let finalContent = "#TG " + contentParts.join('\n\n');

		const updateStmt = db.prepare("UPDATE notes SET content = ?, files = ?, pics = ?, videos = ? WHERE id = ?");
		await updateStmt.bind(
			finalContent,
			JSON.stringify(filesMeta),
			JSON.stringify(picObjects),
			JSON.stringify(videoObjects), // [鏂板] 缁戝畾 videoObjects
			noteId
		).run();

		await processNoteTags(db, noteId, finalContent);
		await sendTelegramMessage(chatId, `鉁?绗旇宸蹭繚瀛橈紒 (ID: ${noteId})`, botToken);

	} catch (e) {
		console.error("Telegram Webhook Error:", e.message);
		if (chatId && botToken) {
			await sendTelegramMessage(chatId, `鉂?淇濆瓨绗旇鏃跺嚭閿? ${e.message}`, botToken);
		}
	}
	return new Response('OK', { status: 200 });
}
/**
 * 鍙戦€佹秷鎭埌鎸囧畾鐨?Telegram 鑱婂ぉ
 * @param {string | number} chatId 鑱婂ぉ ID
 * @param {string} text 瑕佸彂閫佺殑鏂囨湰
 * @param {string} botToken 鏈哄櫒浜?Token
 */
async function sendTelegramMessage(chatId, text, botToken) {
	const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
	const payload = {
		chat_id: chatId,
		text: text,
		parse_mode: 'Markdown' // 涔熷彲浠ヤ娇鐢?'HTML'
	};

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});
		if (!response.ok) {
			const errorBody = await response.json();
			console.error(`Failed to send Telegram message: ${errorBody.description}`);
		}
	} catch (error) {
		console.error(`Error sending Telegram message: ${error.message}`);
	}
}


function extractImageUrls(content) {
	// 姝ｅ垯琛ㄨ揪寮忥細鍏ㄥ眬鍖归厤鎵€鏈?Markdown 鍥剧墖璇硶 ![alt](url)
	// 鍏抽敭鐐癸細
	// 1. /g flag - 纭繚鑳芥壘鍒版枃涓墍鏈夌殑鍥剧墖锛岃€屼笉浠呬粎鏄涓€涓?
	// 2. \!\[.*?\] - 闈炶椽濠湴鍖归厤 alt 鏂囨湰閮ㄥ垎锛屽鐞嗗悇绉嶅鏉傜殑 alt 鍐呭
	// 3. \((.*?)\) - 鎹曡幏缁? ... )锛岄潪璐┆鍦版崟鑾锋嫭鍙峰唴鐨?URL
	const regex = /!\[.*?\]\((.*?)\)/g;

	// 浣跨敤 String.prototype.matchAll() 鏉ヨ幏鍙栨墍鏈夊尮閰嶉」鍜屾崟鑾风粍
	// 瀹冭繑鍥炰竴涓凯浠ｅ櫒锛屾垜浠敤 Array.from 灏嗗叾杞崲涓烘暟缁?
	const matches = Array.from(content.matchAll(regex));

	// 鎻愬彇姣忎釜鍖归厤椤圭殑绗竴涓崟鑾风粍锛堜篃灏辨槸 URL锛?
	const urls = matches.map(match => match[1]);

	// 杩斿洖涓€涓?JSON 瀛楃涓叉暟缁勶紝浠ヤ究鐩存帴瀛樺叆 D1 鐨?TEXT 瀛楁
	return JSON.stringify(urls);
}
/**
 * 澶勭悊绗旇鐨勬爣绛鹃€昏緫锛岃繃婊ゆ帀 URL 涓殑 #
 */
async function processNoteTags(db, noteId, content) {
	const plainTextContent = content.replace(/<[^>]*>/g, '');
	// 1. 瀹氫箟涓や釜姝ｅ垯琛ㄨ揪寮忥細涓€涓敤浜庢爣绛撅紝涓€涓敤浜?URL
	const tagRegex = /#([\p{L}\p{N}_-]+)/gu;
	const urlRegex = /(https?:\/\/[^\s"']*[^\s"'.?,!])/g;

	// 2. 灏嗗唴瀹瑰垎鍓叉垚鈥滄櫘閫氭枃鏈€濆拰鈥滈摼鎺ユ枃鏈€濈殑浜ゆ浛鏁扮粍
	const segments = plainTextContent.split(urlRegex);
	let allTags = [];

	// 3. 閬嶅巻鎵€鏈夌墖娈?
	segments.forEach(segment => {
		// 4. 鍏抽敭锛氬彧鍦ㄣ€愰潪閾炬帴銆戠殑鏂囨湰鐗囨涓煡鎵炬爣绛?
		//    鎴戜滑閫氳繃閲嶆柊娴嬭瘯鏉ュ垽鏂畠鏄惁鏄?URL
		if (!/^(https?:\/\/[^\s"']*[^\s"'.?,!])/.test(segment)) {
			const matchedInSegment = [...segment.matchAll(tagRegex)].map(match => match[1].toLowerCase());
			allTags.push(...matchedInSegment);
		}
	});

	// 5. 灏嗕粠鎵€鏈夊畨鍏ㄧ墖娈典腑鎵惧埌鐨勬爣绛捐繘琛屽幓閲?
	const uniqueTags = [...new Set(allTags)];

	const statements = [];
	statements.push(db.prepare("DELETE FROM note_tags WHERE note_id = ?").bind(noteId));

	if (uniqueTags.length > 0) {
		for (const tagName of uniqueTags) {
			await db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").bind(tagName).run();
			const tag = await db.prepare("SELECT id FROM tags WHERE name = ?").bind(tagName).first();
			if (tag) {
				statements.push(
					db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id, tag_name) VALUES (?, ?, ?)")
						.bind(noteId, tag.id, tagName)
				);
			}
		}
	}
	if (statements.length > 0) {
		await db.batch(statements);
	}
}
/**
 * 澶勭悊鐙珛鐨勫浘鐗囦笂浼犺姹?(浠庣矘璐存搷浣?
 * 灏嗗浘鐗囧瓨鍏?R2 鐨勪竴涓€氱敤 'uploads' 鏂囦欢澶逛腑
 */
async function handleStandaloneImageUpload(request, env) {
	try {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!file || !file.name || file.size === 0) {
			return jsonResponse({ error: 'A file is required for upload.' }, 400);
		}

		const imageId = crypto.randomUUID();
		// 鎴戜滑灏嗙嫭绔嬩笂浼犵殑鍥剧墖缁熶竴鏀惧埌涓€涓?'uploads/' 鐩綍涓嬶紝涓庣瑪璁伴檮浠跺垎寮€
		const r2Key = `uploads/${imageId}`;

		// 灏嗘枃浠舵祦涓婁紶鍒?R2
		await env.NOTES_R2_BUCKET.put(r2Key, file.stream(), {
			httpMetadata: { contentType: file.type },
		});

		// 杩斿洖涓€涓彲鐢ㄤ簬璁块棶姝ゅ浘鐗囩殑鍐呴儴 URL
		// 杩欎釜 URL 瀵瑰簲鎴戜滑涓嬮潰鍒涘缓鐨?handleServeStandaloneImage 鍑芥暟鐨勮矾鐢?
		const imageUrl = `/api/images/${imageId}`;
		return jsonResponse({ success: true, url: imageUrl });

	} catch (e) {
		console.error("Standalone Image Upload Error:", e.message);
		return jsonResponse({ error: 'Upload failed', message: e.message }, 500);
	}
}

/**
 * 閫氳繃 Worker 浠ｇ悊涓婁紶鍥剧墖鍒?Imgur
 */
async function handleImgurProxyUpload(request, env) {
	try {
		const formData = await request.formData();
		// 銆愭敞鎰忋€戜粠鍓嶇鑾峰彇 Client ID锛岃€屼笉鏄‖缂栫爜鍦ㄥ悗绔?
		const clientId = formData.get('clientId');
		if (!clientId) {
			return jsonResponse({ error: 'Imgur Client ID is required.' }, 400);
		}

		// Imgur 闇€瑕?'image' 瀛楁
		const imageFile = formData.get('file');
		const imgurFormData = new FormData();
		imgurFormData.append('image', imageFile);

		const imgurResponse = await fetch('https://api.imgur.com/3/image', {
			method: 'POST',
			headers: {
				'Authorization': `Client-ID ${clientId}`,
			},
			body: imgurFormData,
		});

		if (!imgurResponse.ok) {
			const errorBody = await imgurResponse.json();
			throw new Error(`Imgur API responded with status ${imgurResponse.status}: ${errorBody.data.error}`);
		}

		const result = await imgurResponse.json();

		if (!result.success) {
			throw new Error('Imgur API returned a failure response.');
		}

		return jsonResponse({ success: true, url: result.data.link });

	} catch (e) {
		console.error("Imgur Proxy Error:", e.message);
		return jsonResponse({ error: 'Imgur upload failed via proxy', message: e.message }, 500);
	}
}

async function handleGetAllAttachments(request, env) {
	const db = env.DB;
	const url = new URL(request.url);
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = 20; // 姣忔鍔犺浇20鏉￠檮浠?
	const offset = (page - 1) * limit;

	try {
		// 浣跨敤 Common Table Expression (CTE) 鍜?UNION ALL 鏉ユ瀯寤轰竴涓珮鏁堢殑鍗曚竴鏌ヨ
		const query = `
            WITH combined_attachments AS (
                SELECT
                    n.id AS noteId, n.updated_at AS timestamp, 'image' AS type,
                    json_each.value AS url, NULL AS name, NULL AS size, NULL AS id
                FROM notes n, json_each(COALESCE(n.pics,'[]')) AS json_each
                WHERE json_valid(n.pics) AND json_array_length(n.pics) > 0

                UNION ALL

                SELECT
                    n.id AS noteId, n.updated_at AS timestamp, 'video' AS type,
                    json_each.value AS url, NULL AS name, NULL AS size, NULL AS id
                FROM notes n, json_each(COALESCE(n.videos,'[]')) AS json_each
                WHERE json_valid(n.videos) AND json_array_length(n.videos) > 0

                UNION ALL

                SELECT
                    n.id AS noteId, n.updated_at AS timestamp, 'video' AS type,
                    ('/api/files/' || n.id || '/' || json_extract(json_each.value, '$.id')) AS url,
                    json_extract(json_each.value, '$.name') AS name,
                    json_extract(json_each.value, '$.size') AS size,
                    json_extract(json_each.value, '$.id') AS id
                FROM notes n, json_each(COALESCE(n.files,'[]')) AS json_each
                WHERE json_valid(n.files) AND json_array_length(n.files) > 0
                    AND json_extract(json_each.value, '$.type') LIKE 'video/%'

                UNION ALL

                SELECT
                    n.id AS noteId, n.updated_at AS timestamp, 'file' AS type,
                    NULL AS url, json_extract(json_each.value, '$.name') AS name,
                    json_extract(json_each.value, '$.size') AS size,
                    json_extract(json_each.value, '$.id') AS id
                FROM notes n, json_each(COALESCE(n.files,'[]')) AS json_each
                WHERE json_valid(n.files) AND json_array_length(n.files) > 0
                    AND (json_extract(json_each.value, '$.type') IS NULL OR json_extract(json_each.value, '$.type') NOT LIKE 'video/%')
            )
            SELECT * FROM combined_attachments
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?;
        `;

		// 涓轰簡鍒ゆ柇鏄惁鏈夋洿澶氶〉闈紝鎴戜滑璇锋眰 limit + 1 鏉¤褰?
		const stmt = db.prepare(query);
		const { results: attachmentsPlusOne } = await stmt.bind(limit + 1, offset).all();

		const hasMore = attachmentsPlusOne.length > limit;
		const attachments = attachmentsPlusOne.slice(0, limit);

		return jsonResponse({
			attachments: attachments,
			hasMore: hasMore
		});

	} catch (e) {
		console.error("Get All Attachments Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * 鏍规嵁 ID 浠?R2 涓彁渚涳紙鏈嶅姟锛変竴涓嫭绔嬩笂浼犵殑鍥剧墖
 * @param {string} imageId The UUID of the image.
 * @param {object} env The Worker environment/bindings.
 * @returns {Promise<Response>}
 */
async function handleServeStandaloneImage(imageId, env) {
	const r2Key = `uploads/${imageId}`;
	const object = await env.NOTES_R2_BUCKET.get(r2Key);

	if (object === null) {
		return new Response('File not found', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	// 璁剧疆闀挎椂闂寸殑娴忚鍣ㄧ紦瀛橈紝鍥犱负杩欎簺鍥剧墖鍐呭鏄笉鍙彉鐨?
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');

	return new Response(object.body, { headers });
}


/**
 * 浠庢墎骞崇殑鑺傜偣鍒楄〃涓瀯寤哄眰绾ф爲缁撴瀯
 * @param {Array<object>} nodes - 浠庢暟鎹簱鏌ヨ鍑虹殑鑺傜偣鏁扮粍
 * @param {string|null} parentId - 褰撳墠瑕佹煡鎵剧殑鐖惰妭鐐笽D
 * @returns {Array<object>} - 鏋勫缓濂界殑灞傜骇鏍戞暟缁?
 */
function buildTree(nodes, parentId = null) {
	const tree = [];
	nodes
		.filter(node => String(node.parent_id) === String(parentId) || (parentId === null && (node.parent_id === "0" || node.parent_id === null)))
		.forEach(node => {
			const children = buildTree(nodes, node.id);
			if (children.length > 0) {
				node.children = children;
			}
			tree.push(node);
		});
	return tree;
}

/**
 * GET /api/docs/tree - 鑾峰彇鎵€鏈夋枃妗ｈ妭鐐瑰苟杩斿洖鏍戠姸缁撴瀯
 */
async function handleDocsTree(request, env) {
	try {
		const stmt = env.DB.prepare("SELECT id, type, title, parent_id FROM nodes ORDER BY title ASC");
		const { results } = await stmt.all();
		const tree = buildTree(results, null);
		return jsonResponse(tree);
	} catch (e) {
		console.error("Docs Tree Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * GET /api/docs/node/:id - 鑾峰彇鍗曚釜鏂囨。鑺傜偣鐨勫唴瀹?
 */
async function handleDocsNodeGet(request, nodeId, env) {
	try {
		const stmt = env.DB.prepare("SELECT id, type, title, content FROM nodes WHERE id = ?");
		const node = await stmt.bind(nodeId).first();
		if (!node) {
			return jsonResponse({ error: 'Not Found' }, 404);
		}
		return jsonResponse(node);
	} catch (e) {
		console.error(`Docs Get Node Error (id: ${nodeId}):`, e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * 浠?HTML 鍐呭涓彁鍙栫涓€涓爣棰樹綔涓烘枃妗ｅ悕绉?
 */
function extractTitleFromContent(content) {
	if (!content) return null;
	// 灏濊瘯鍖归厤 HTML 涓殑 h1
	const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
	if (h1Match) {
		return h1Match[1].replace(/<[^>]*>/g, '').trim();
	}
	// 灏濊瘯鍖归厤 Markdown 鏍囬
	const mdMatch = content.match(/^#\s+(.+)/m);
	if (mdMatch) {
		return mdMatch[1].trim();
	}
	return null;
}

/**
 * PUT /api/docs/node/:id - 鏇存柊锛堜繚瀛橈級涓€涓枃妗ｈ妭鐐圭殑鍐呭锛屽悓鏃惰嚜鍔ㄥ悓姝ユ爣棰?
 */
async function handleDocsNodeUpdate(request, nodeId, env) {
	try {
		const { content } = await request.json();
		const now = Date.now();
		// 浠庡唴瀹逛腑鎻愬彇鏍囬锛屽悓姝ユ洿鏂?title 瀛楁
		const title = extractTitleFromContent(content);
		if (title) {
			const stmt = env.DB.prepare("UPDATE nodes SET content = ?, title = ?, updated_at = ? WHERE id = ?");
			await stmt.bind(content, title, now, nodeId).run();
		} else {
			const stmt = env.DB.prepare("UPDATE nodes SET content = ?, updated_at = ? WHERE id = ?");
			await stmt.bind(content, now, nodeId).run();
		}
		return jsonResponse({ success: true, id: nodeId });
	} catch (e) {
		console.error(`Docs Update Node Error (id: ${nodeId}):`, e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * POST /api/docs/node - 鍒涘缓涓€涓柊鐨勬枃妗ｈ妭鐐癸紙鏂囦欢鎴栫洰褰曪級
 */
async function handleDocsNodeCreate(request, env) {
	try {
		// 淇锛氬墠绔彲鑳戒紶 null锛岀粺涓€杞负 "0"
		const { type, title, parent_id } = await request.json();
		const safeParentId = parent_id ?? "0";
		if (!type || !title || !['file', 'folder'].includes(type)) {
			return jsonResponse({ error: 'Invalid input' }, 400);
		}

		const newNode = {
			id: Date.now(),
			type,
			title,
			content: type === 'file' ? `# ${title}` : null,
			parent_id: safeParentId,
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		const stmt = env.DB.prepare(
			"INSERT INTO nodes (id, type, title, content, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
		);
		await stmt.bind(...Object.values(newNode)).run();

		return jsonResponse(newNode, 201);
	} catch (e) {
		console.error("Docs Create Node Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * Recursively finds all descendant node IDs for a given parent ID.
 * @param {D1Database} db - The D1 database instance.
 * @param {string} parentId - The ID of the node to start from.
 * @returns {Promise<string[]>} A flat array of all descendant IDs.
 */
async function getAllDescendantIds(db, parentId) {
	let allIds = [];
	let queue = [parentId];
	while (queue.length > 0) {
		const currentId = queue.shift();
		const { results: children } = await db.prepare("SELECT id FROM nodes WHERE parent_id = ?").bind(currentId).all();
		if (children && children.length > 0) {
			const childIds = children.map(c => c.id);
			allIds.push(...childIds);
			queue.push(...childIds);
		}
	}
	return allIds;
}

// DELETE and REMOVE the entire `getAllDescendantIds` function.

/**
 * DELETE /api/docs/node/:id - 鍒犻櫎涓€涓妭鐐广€?
 * 鏁版嵁搴撶殑 "ON DELETE CASCADE" 绾︽潫浼氳嚜鍔ㄥ鐞嗘墍鏈夊瓙鑺傜偣鐨勫垹闄ゃ€?
 */
async function handleDocsNodeDelete(request, nodeId, env) {
	const db = env.DB;
	try {
		const nodeToDelete = await db.prepare("SELECT id FROM nodes WHERE id = ?").bind(nodeId).first();
		if (!nodeToDelete) {
			return jsonResponse({ error: "鑺傜偣鏈壘鍒般€? }, 404);
		}

		// 鍙渶瑕佸垹闄よ繖涓€涓妭鐐癸紝鏁版嵁搴撲細鑷姩鍒犻櫎鎵€鏈夊瓙瀛欒妭鐐广€?
		await db.prepare("DELETE FROM nodes WHERE id = ?").bind(nodeId).run();

		// 鎴戜滑涓嶅啀闇€瑕佽繑鍥炴墍鏈夎鍒犻櫎鐨勫瓙鑺傜偣ID锛屽洜涓哄墠绔€昏緫涔熶笉渚濊禆瀹冦€?
		return jsonResponse({ success: true, deletedIds: [nodeId] });

	} catch (e) {
		console.error(`Docs Delete Node Error (id: ${nodeId}):`, e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

async function handleDocsNodeMove(request, nodeId, env) {
	const db = env.DB;
	try {
		let { new_parent_id } = await request.json();
		// 淇锛氬墠绔紶 null 缁熶竴鏇挎崲涓?"0"
		if (new_parent_id === null || new_parent_id === undefined) {
			new_parent_id = "0";
		}
		const nodeToMove = await db.prepare("SELECT * FROM nodes WHERE id = ?").bind(nodeId).first();

		// --- Validation ---
		if (!nodeToMove) {
			return jsonResponse({ error: "The node you are trying to move does not exist." }, 404);
		}
		if (nodeId === new_parent_id) {
			return jsonResponse({ error: "Cannot move a node into itself." }, 400);
		}
		if (nodeToMove.parent_id === new_parent_id) {
			return jsonResponse({ success: true, message: "Node is already in the target location." }); // No-op
		}

		if (new_parent_id !== "0") {
			const parentNode = await db.prepare("SELECT type FROM nodes WHERE id = ?").bind(new_parent_id).first();
			if (!parentNode) {
				return jsonResponse({ error: "Target destination does not exist." }, 400);
			}
			if (parentNode.type !== 'folder') {
				return jsonResponse({ error: "Target destination must be a folder." }, 400);
			}
		}

		let currentParentId = new_parent_id;
		while (currentParentId !== "0") {
			if (currentParentId === nodeId) {
				return jsonResponse({ error: "Cannot move a folder into one of its own descendants." }, 400);
			}
			const parent = await db.prepare("SELECT parent_id FROM nodes WHERE id = ?").bind(currentParentId).first();
			if (!parent) break;
			currentParentId = parent.parent_id;
		}

		// --- Update the node ---
		const stmt = db.prepare("UPDATE nodes SET parent_id = ?, updated_at = ? WHERE id = ?");
		await stmt.bind(new_parent_id, Date.now(), nodeId).run();

		return jsonResponse({ success: true });
	} catch (e) {
		console.error(`Docs Move Node Error (id: ${nodeId}):`, e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * PATCH /api/docs/node/:id/rename - Renames a node.
 */
async function handleDocsNodeRename(request, nodeId, env) {
	const db = env.DB;
	try {
		const { new_title } = await request.json();

		// 楠岃瘉 new_title 鏄惁瀛樺湪涓斾笉涓虹┖
		if (!new_title || typeof new_title !== 'string' || new_title.trim() === '') {
			return jsonResponse({ error: "A valid new title is required." }, 400);
		}

		const stmt = db.prepare("UPDATE nodes SET title = ?, updated_at = ? WHERE id = ?");
		await stmt.bind(new_title.trim(), Date.now(), nodeId).run();

		return jsonResponse({ success: true, new_title: new_title.trim() });
	} catch (e) {
		console.error(`Docs Rename Node Error (id: ${nodeId}):`, e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * 涓烘枃浠剁敓鎴愪竴涓敮涓€鐨勩€佸彲鍏紑璁块棶鐨勯摼鎺ャ€?
 * POST /api/notes/:noteId/files/:fileId/share
 */
async function handleShareFileRequest(noteId, fileId, request, env) {
	const db = env.DB;
	const id = parseInt(noteId);
	if (isNaN(id)) {
		return new Response('Invalid Note ID', { status: 400 });
	}

	try {
		const note = await db.prepare("SELECT files FROM notes WHERE id = ?").bind(id).first();
		if (!note) {
			return jsonResponse({ error: 'Note not found' }, 404);
		}

		let files = [];
		try {
			if (typeof note.files === 'string') {
				files = JSON.parse(note.files);
			}
		} catch(e) { /* ignore */ }

		const fileIndex = files.findIndex(f => f.id === fileId);
		if (fileIndex === -1) {
			return jsonResponse({ error: 'File not found in this note' }, 404);
		}

		const file = files[fileIndex];
		let publicId = file.public_id;

		if (!publicId) {
			publicId = crypto.randomUUID();
			// 1. 鍦?KV 涓瓨鍌ㄦ槧灏勫叧绯伙紝鐢ㄤ簬蹇€熴€佸厤璁よ瘉鐨勬煡鎵?
			await env.NOTES_KV.put(`public_file:${publicId}`, JSON.stringify({
				noteId: id,
				fileId: file.id,
				fileName: file.name,
				contentType: file.type
			}));

			// 2. 灏?public_id 鎸佷箙鍖栧埌 D1 鏁版嵁搴撲腑
			files[fileIndex].public_id = publicId;
			await db.prepare("UPDATE notes SET files = ? WHERE id = ?").bind(JSON.stringify(files), id).run();
		}

		const { protocol, host } = new URL(request.url);
		const publicUrl = `${protocol}//${host}/api/public/file/${publicId}`;

		return jsonResponse({ url: publicUrl });
	} catch (e) {
		console.error(`Share File Error (noteId: ${noteId}, fileId: ${fileId}):`, e.message);
		return jsonResponse({ error: 'Database error while generating link', message: e.message }, 500);
	}
}

/**
 * 澶勭悊瀵瑰叕寮€鏂囦欢閾炬帴鐨勮闂姹傦紝鏃犻渶韬唤楠岃瘉銆?
 * GET /api/public/file/:publicId
 * 鐜板湪鑳藉悓鏃跺鐞嗙瑪璁伴檮浠跺拰鐙珛涓婁紶鐨勫浘鐗囥€?
 */
async function handlePublicFileRequest(publicId, request, env) {
	const kvData = await env.NOTES_KV.get(`public_file:${publicId}`, 'json');
	if (!kvData) {
		return new Response('Public link not found or has expired.', { status: 404 });
	}

	let object;
	let fileName;
	let contentType;

	if (kvData.standaloneImageId) {
		// 1. 鏄嫭绔嬩笂浼犵殑鍥剧墖
		object = await env.NOTES_R2_BUCKET.get(`uploads/${kvData.standaloneImageId}`);
		fileName = kvData.fileName || `image_${kvData.standaloneImageId}.png`;
		contentType = kvData.contentType || 'image/png';
	} else if (kvData.noteId && kvData.fileId) {
		// 2. 鏄瑪璁扮殑闄勪欢
		object = await env.NOTES_R2_BUCKET.get(`${kvData.noteId}/${kvData.fileId}`);
		fileName = kvData.fileName;
		contentType = kvData.contentType;
	} else {
		return new Response('Invalid public link data.', { status: 500 });
	}

	if (object === null) {
		return new Response('File not found in storage', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	headers.set('Cache-Control', 'public, max-age=86400, immutable');

	headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
	const textLikeExtensions = ['txt', 'md', 'log', 'json', 'js', 'css', 'html', 'xml', 'yaml', 'yml', 'py', 'sh', 'rb', 'go', 'java', 'c', 'cpp'];
	if ((contentType || '').startsWith('text/') || textLikeExtensions.includes((fileName || '').split('.').pop().toLowerCase())) {
		headers.set('Content-Type', 'text/plain; charset=utf-8');
	} else {
		headers.set('Content-Type', contentType || 'application/octet-stream');
	}

	return new Response(object.body, { headers });
}

/**
 * [璁よ瘉] 澶勭悊鍒涘缓鎴栬幏鍙?鏇存柊 Memos 鍒嗕韩閾炬帴鐨勮姹?
 * POST /api/notes/:noteId/share
 * Body (鍙€?:
 * {
 *   "expirationTtl": 3600, // (in seconds) for initial creation or update
 *   "publicId": "some-uuid" // for updating TTL of an existing link
 * }
 */
async function handleShareNoteRequest(noteId, request, env) {
	try {
		const body = await request.json().catch(() => ({}));

		if (body.publicId && body.expirationTtl !== undefined) {
			const noteShareKey = `note_share:${noteId}`;
			const publicMemoKey = `public_memo:${body.publicId}`;

			// 涓轰簡瀹夊叏锛岄獙璇佷竴涓?publicId 鏄惁鐪熺殑灞炰簬杩欎釜 noteId
			const storedPublicId = await env.NOTES_KV.get(noteShareKey);
			if (storedPublicId !== body.publicId) {
				return jsonResponse({ error: 'Invalid public ID for this note.' }, 400);
			}

			// 鑾峰彇鏃у€间互渚块噸鏂板啓鍏?
			const memoData = await env.NOTES_KV.get(publicMemoKey);
			if (!memoData) {
				return jsonResponse({ error: 'Share link not found or already expired.' }, 404);
			}

			const options = {};
			if (body.expirationTtl > 0) {
				options.expirationTtl = body.expirationTtl;
			}
			// 濡傛灉 expirationTtl <= 0锛屽垯涓嶈缃?options.expirationTtl锛孠V 浼氬皢鍏惰涓烘案涓嶈繃鏈?

			// 浣跨敤鏂?TTL 閲嶆柊鍐欏叆涓や釜閿?
			await Promise.all([
				env.NOTES_KV.put(publicMemoKey, memoData, options),
				env.NOTES_KV.put(noteShareKey, body.publicId, options)
			]);

			return jsonResponse({ success: true, message: 'Expiration updated.' });

		} else {
			// --- 鍒涘缓鎴栬幏鍙栨柊閾炬帴 ---
			let publicId = await env.NOTES_KV.get(`note_share:${noteId}`);

			if (!publicId) {
				publicId = crypto.randomUUID();
				// 榛樿杩囨湡鏃堕棿涓?1 灏忔椂 (3600 绉?
				const expirationTtl = (body.expirationTtl !== undefined) ? body.expirationTtl : 3600;
				const options = {};
				if (expirationTtl > 0) {
					options.expirationTtl = expirationTtl;
				}

				await Promise.all([
					env.NOTES_KV.put(`public_memo:${publicId}`, JSON.stringify({ noteId: parseInt(noteId, 10) }), options),
					env.NOTES_KV.put(`note_share:${noteId}`, publicId, options)
				]);
			}

			const { protocol, host } = new URL(request.url);
			const displayUrl = `${protocol}//${host}/share/${publicId}`;
			const rawUrl = `${protocol}//${host}/api/public/note/raw/${publicId}`;

			return jsonResponse({ displayUrl, rawUrl, publicId }); // 杩斿洖 publicId 浠ヤ究鍓嶇鏇存柊
		}
	} catch (e) {
		console.error(`Share/Update Note Error (noteId: ${noteId}):`, e.message);
		return jsonResponse({ error: 'Database or KV error during operation' }, 500);
	}
}

/**
 * 澶勭悊鍙栨秷 Memos 鍒嗕韩鐨勮姹?
 * DELETE /api/notes/:noteId/share
 */
async function handleUnshareNoteRequest(noteId, env) {
	try {
		const publicId = await env.NOTES_KV.get(`note_share:${noteId}`);
		if (publicId) {
			await Promise.all([
				env.NOTES_KV.delete(`public_memo:${publicId}`),
				env.NOTES_KV.delete(`note_share:${noteId}`)
			]);
		}
		return jsonResponse({ success: true, message: 'Sharing has been revoked.' });
	} catch (e) {
		console.error(`Unshare Note Error (noteId: ${noteId}):`, e.message);
		return jsonResponse({ error: 'Database error while revoking link' }, 500);
	}
}
/**
 * 澶勭悊瀵瑰崟涓垎浜?Memos 鍐呭鐨勮姹?
 * GET /api/public/note/:publicId
 */
async function handlePublicNoteRequest(publicId, env) {
	const kvData = await env.NOTES_KV.get(`public_memo:${publicId}`, 'json');
	if (!kvData || !kvData.noteId) {
		return jsonResponse({ error: 'Shared note not found or has expired' }, 404);
	}

	const noteId = kvData.noteId;

	try {
		const note = await env.DB.prepare("SELECT id, content, updated_at, files FROM notes WHERE id = ?").bind(noteId).first();
		if (!note) {
			return jsonResponse({ error: 'Shared note content not found' }, 404);
		}

		// --- 杈呭姪鍑芥暟锛氬皢浠讳綍绉佹湁 URL 杞崲涓哄叕寮€ URL ---
		const createPublicUrlFor = async (privateUrl) => {
			const fileMatch = privateUrl.match(/^\/api\/files\/(\d+)\/([a-zA-Z0-9-]+)$/);
			const imageMatch = privateUrl.match(/^\/api\/images\/([a-zA-Z0-9-]+)$/);

			let kvPayload = null;
			if (fileMatch) {
				kvPayload = { noteId: parseInt(fileMatch[1]), fileId: fileMatch[2], fileName: 'media' };
			} else if (imageMatch) {
				kvPayload = { standaloneImageId: imageMatch[1], fileName: 'image.png' };
			}

			if (kvPayload) {
				const newPublicId = crypto.randomUUID();
				await env.NOTES_KV.put(`public_file:${newPublicId}`, JSON.stringify(kvPayload));
				return `/api/public/file/${newPublicId}`;
			}

			return privateUrl; // 濡傛灉涓嶆槸绉佹湁閾炬帴锛屽垯鍘熸牱杩斿洖
		};

		// 1. 澶勭悊绗旇姝ｆ枃 `content` 涓殑鍐呰仈鍥剧墖鍜岃棰?
		const urlRegex = /(\/api\/(?:files|images)\/[a-zA-Z0-9\/-]+)/g;
		const matches = [...note.content.matchAll(urlRegex)];
		let processedContent = note.content;
		for (const match of matches) {
			const privateUrl = match[0];
			const publicUrl = await createPublicUrlFor(privateUrl);
			processedContent = processedContent.replace(privateUrl, publicUrl);
		}
		note.content = processedContent;

		// 2. 澶勭悊 `files` 闄勪欢鍒楄〃
		let files = [];
		if (typeof note.files === 'string') {
			try { files = JSON.parse(note.files); } catch (e) { /* an empty array is fine */ }
		}
		for (const file of files) {
			if (file.id) { // 鍙鐞嗘湁 id 鐨勫唴閮ㄦ枃浠?
				const privateUrl = `/api/files/${note.id}/${file.id}`;
				// 澶嶇敤涓婇潰鐨勯€昏緫锛屼絾杩欐鎴戜滑鐭ラ亾鎵€鏈夊厓鏁版嵁
				const filePublicId = crypto.randomUUID();
				await env.NOTES_KV.put(`public_file:${filePublicId}`, JSON.stringify({
					noteId: note.id,
					fileId: file.id,
					fileName: file.name,
					contentType: file.type
				}));
				file.public_url = `/api/public/file/${filePublicId}`;
			}
		}
		note.files = files;

		// 3. 瀹夊叏澶勭悊锛氱Щ闄ゆ晱鎰熶俊鎭?
		delete note.id;

		// `pics` 鍜?`videos` 瀛楁鐨勫唴瀹瑰凡缁忚澶勭悊骞跺寘鍚湪 `content` 涓紝
		// 涓轰繚鎸?API 鍝嶅簲骞插噣锛屾垜浠笉鍐嶉渶瑕佸畠浠€?
		delete note.pics;
		delete note.videos;

		return jsonResponse(note);

	} catch (e) {
		console.error(`Public Note Error (publicId: ${publicId}):`, e.message);
		return jsonResponse({ error: 'Database Error' }, 500);
	}
}

/**
 * 澶勭悊瀵瑰垎浜?Memos Raw 鍐呭鐨勮姹?
 * GET /api/public/note/raw/:publicId
 */
async function handlePublicRawNoteRequest(publicId, env) {
	// 1. 浠?KV 鑾峰彇 noteId
	const kvData = await env.NOTES_KV.get(`public_memo:${publicId}`, 'json');
	if (!kvData || !kvData.noteId) {
		return new Response('Not Found', { status: 404 });
	}

	try {
		// 2. 浣跨敤鑾峰彇鍒扮殑 noteId 浠?D1 鏌ヨ绗旇鍐呭
		const note = await env.DB.prepare("SELECT content FROM notes WHERE id = ?").bind(kvData.noteId).first();
		if (!note) {
			return new Response('Not Found', { status: 404 });
		}
		const headers = new Headers({ 'Content-Type': 'text/plain; charset=utf-8' });
		return new Response(note.content, { headers });
	} catch (e) {
		console.error(`Public Raw Note Error (publicId: ${publicId}):`, e.message);
		return new Response('Server Error', { status: 500 });
	}
}

/**
 * 澶勭悊绗旇鍚堝苟璇锋眰
 * POST /api/notes/merge
 * Body: { sourceNoteId: number, targetNoteId: number, addSeparator: boolean }
 */
async function handleMergeNotes(request, env) {
	const db = env.DB;
	try {
		const { sourceNoteId, targetNoteId, addSeparator } = await request.json();

		if (!sourceNoteId || !targetNoteId || sourceNoteId === targetNoteId) {
			return jsonResponse({ error: 'Invalid source or target note ID.' }, 400);
		}

		const [sourceNote, targetNote] = await Promise.all([
			db.prepare("SELECT * FROM notes WHERE id = ?").bind(sourceNoteId).first(),
			db.prepare("SELECT * FROM notes WHERE id = ?").bind(targetNoteId).first(),
		]);

		if (!sourceNote || !targetNote) {
			return jsonResponse({ error: 'One or both notes not found.' }, 404);
		}

		// 鐩爣绗旇鍦ㄥ墠锛屾簮绗旇鍦ㄥ悗
		const separator = addSeparator ? '\n\n---\n\n' : '\n\n';
		const mergedContent = targetNote.content + separator + sourceNote.content;
		const targetFiles = JSON.parse(targetNote.files || '[]');
		const sourceFiles = JSON.parse(sourceNote.files || '[]');
		const mergedFiles = JSON.stringify([...targetFiles, ...sourceFiles]);

		const mergedTimestamp = targetNote.updated_at;

		// --- 鏁版嵁搴撲笌 R2 鎿嶄綔 ---

		// 鏇存柊鐩爣绗旇
		const stmt = db.prepare(
			"UPDATE notes SET content = ?, files = ?, updated_at = ? WHERE id = ?"
		);
		await stmt.bind(mergedContent, mergedFiles, mergedTimestamp, targetNote.id).run();

		// 涓烘洿鏂板悗鐨勭洰鏍囩瑪璁伴噸鏂板鐞嗘爣绛?
		await processNoteTags(db, targetNote.id, mergedContent);

		// 鍒犻櫎婧愮瑪璁?
		await db.prepare("DELETE FROM notes WHERE id = ?").bind(sourceNote.id).run();

		// 灏嗘簮绗旇鐨勬枃浠剁Щ鍔ㄥ埌鐩爣绗旇鐨?R2 鐩綍涓?
		if (sourceFiles.length > 0) {
			const r2 = env.NOTES_R2_BUCKET;
			for (const file of sourceFiles) {
				const oldKey = `${sourceNote.id}/${file.id}`;
				const newKey = `${targetNote.id}/${file.id}`;
				const object = await r2.get(oldKey);
				if (object) {
					await r2.put(newKey, object.body);
					await r2.delete(oldKey);
				}
			}
		}

		// 杩斿洖鏇存柊鍚庣殑鐩爣绗旇
		const updatedMergedNote = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(targetNote.id).first();
		if (typeof updatedMergedNote.files === 'string') {
			updatedMergedNote.files = JSON.parse(updatedMergedNote.files);
		}

		return jsonResponse(updatedMergedNote);

	} catch (e) {
		console.error("Merge Notes Error:", e.message, e.cause);
		return jsonResponse({ error: 'Database or R2 error during merge', message: e.message }, 500);
	}
}

/**
 * 缁熶竴鐨?JSON 鍝嶅簲鍑芥暟
 */
function jsonResponse(data, status = 200, headers = new Headers()) {
	headers.set('Content-Type', 'application/json');
	return new Response(JSON.stringify(data, null, 2), { status, headers });
}

