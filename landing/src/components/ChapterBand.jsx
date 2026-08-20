const ChapterBand = ({ index, title, summary }) => (
    <div className="chapter">
        <div className="container chapter-inner">
            <span className="mono">{index} / {title}</span>
            <span>{summary}</span>
        </div>
    </div>
);

export default ChapterBand;
