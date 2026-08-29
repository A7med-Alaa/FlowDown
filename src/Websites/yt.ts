import { youtubeDl } from "youtube-dl-exec";

export function isYouTubeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, "");

        // youtu.be short links: youtu.be/VIDEO_ID
        if (host === "youtu.be") {
            return parsed.pathname.length > 1;
        }

        // youtube.com / m.youtube.com / music.youtube.com
        if (
            host === "youtube.com" ||
            host === "m.youtube.com" ||
            host === "music.youtube.com"
        ) {
            // /watch?v=VIDEO_ID
            if (parsed.pathname === "/watch" && parsed.searchParams.has("v"))
                return true;
            // /shorts/VIDEO_ID
            if (parsed.pathname.startsWith("/shorts/")) return true;
            // /embed/VIDEO_ID
            if (parsed.pathname.startsWith("/embed/")) return true;
            // /live/VIDEO_ID
            if (parsed.pathname.startsWith("/live/")) return true;
        }

        return false;
    } catch {
        return false; // not a valid URL at all
    }
}

export async function getDirectYtUrl(
    url: string,
): Promise<{ audio: string; title: string }> {
    return new Promise(async (resolve, reject) => {
        if (!isYouTubeUrl(url)) {
            reject("Not a youtube link");
            return;
        }

        const info: any = await youtubeDl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true,
        });

        // only consider direct https formats, skip m3u8/dash manifests
        // const directFormats = info.formats.filter(
        //     (f: any) => f.protocol === "https",
        // );

        // const videoFormats = directFormats
        //     .filter(
        //         (f: any) =>
        //             f.vcodec !== "none" &&
        //             f.acodec === "none" &&
        //             f.ext === "mp4" &&
        //             f.vcodec.includes("avc1"),
        //     )
        //     .sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0));

        const originalLang = info.language;

        const allAudioFormats = info.formats
            .filter(
                (f: any) =>
                    f.protocol === "https" &&
                    f.acodec !== "none" &&
                    f.vcodec === "none" &&
                    f.ext === "m4a" &&
                    f.language === originalLang,
            )
            .sort((a: any, b: any) => (b.abr ?? 0) - (a.abr ?? 0));

        // const originalAudioFormats = originalLang
        //     ? allAudioFormats.filter((f: any) => f.language === originalLang)
        //     : [];

        // const audioFormats =
        //     originalAudioFormats.length > 0 ? originalAudioFormats : allAudioFormats;

        // videoFormats.map((v: any) => console.log(v.resolution));
        // const bestVideo = videoFormats[0];
        // const bestAudio = audioFormats[0];
        const bestAudio = allAudioFormats[0];

        // if (!bestVideo || !bestAudio) {
        if (!bestAudio) {
            throw new Error(
                "No direct https video/audio formats found for this video",
            );
        }

        // resolve({ video: bestVideo.url, audio: bestAudio.url, title: info.title });
        resolve({ audio: bestAudio.url, title: info.title });
    });
}
