/**
 * Vite 配置文件
 * - 配置开发服务器代理，将 API 请求转发到后端
 * - 配置 Socket.IO WebSocket 代理
 */
import { defineConfig } from 'vite';

export default defineConfig({
    // 开发服务器配置
    server: {
        port: 8001,
        host: true, // 允许局域网访问
        allowedHosts: ['www.wszzwh.site', 'wszzwh.site'], // 允许的域名白名单
        // 代理配置 - 将 API 和 WebSocket 请求转发到后端
        proxy: {
            // API 请求代理
            '/api': {
                target: 'http://localhost:9001',
                changeOrigin: true,
            },
            // Socket.IO WebSocket 代理
            '/socket.io': {
                target: 'http://localhost:9001',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    // 构建配置
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
