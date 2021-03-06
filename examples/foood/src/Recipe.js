// @flow
import * as React from 'react';
import Button from '@material-ui/core/Button';
import type { Client, Collection } from '../../../packages/client-bundle';
import { useCollection, useItem } from '../../../packages/client-react';

import { Route, Link, useRouteMatch, useParams, useHistory } from 'react-router-dom';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import EditIcon from '@material-ui/icons/Edit';
import Star from '@material-ui/icons/Star';
import StarOutline from '@material-ui/icons/StarOutline';
import { makeStyles } from '@material-ui/core/styles';
import deepEqual from '@birchill/json-equalish';

import renderQuill from './renderQuill';
import { imageUrl } from './utils';
import TagsEditor from './TagsEditor';
import { NewComment, EditComment } from './EditComment';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import { type Homepage } from '../private-collections';
import type { RecipeT, TagT, RecipeStatus } from '../collections';
import QueueButton from './QueueButton';
import MealPlanButton from './MealPlanButton';
import Comment from './Comment';

const useStyles = makeStyles((theme) => ({
    container: {
        fontSize: 20,
        lineHeight: 1.8,
        fontWeight: 300,
        marginBottom: theme.spacing(10),
    },
    headerImage: {
        width: '100%',
        maxHeight: 300,
        borderRadius: 8,
        objectFit: 'cover',
    },
    title: {
        fontSize: 44,
        lineHeight: 1,
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: "'Abril Fatface', cursive",
    },
    tags: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 8,
        fontSize: '60%',
    },
    tag: {
        color: 'inherit',
        marginRight: 8,
        padding: 8,
        display: 'inline-block',
        lineHeight: 1,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        textDecoration: 'none',
    },
    text: {
        marginTop: theme.spacing(2),
    },
}));

const formatClass = (format) => {
    if (!format) {
        return null;
    }
    if (format.instruction) {
        return;
    }
};

const useSetTitle = (title) => {
    React.useEffect(() => {
        document.title = title;
    }, [title]);
};

const statuses: Array<RecipeStatus> = ['to try', 'approved', 'favorite', 'rejected'];

const ShowTags = ({ recipe, col, client, actorId }) => {
    const styles = useStyles();
    const [editingTags, setEditingTags] = React.useState(false);
    const [tagsCol, allTags] = useCollection<TagT, _>(React, client, 'tags');

    if (editingTags) {
        return (
            <TagsEditor
                tagsCol={tagsCol}
                actorId={actorId}
                recipeId={recipe.id}
                client={client}
                tags={recipe.tags}
                allTags={allTags}
                col={col}
                onClose={() => setEditingTags(false)}
            />
        );
    } else {
        return (
            <div className={styles.tags}>
                <div style={{ marginRight: 8 }}>Tags:</div>
                {recipe.tags != null && Object.keys(recipe.tags).length > 0
                    ? Object.keys(recipe.tags)
                          .filter((tid) => !!allTags[tid])
                          .map((tid) => (
                              <Link to={`/tag/${tid}`} className={styles.tag} key={tid}>
                                  {allTags[tid].text}
                              </Link>
                          ))
                    : null}
                <IconButton
                    edge="start"
                    style={{ marginRight: 16 }}
                    color="inherit"
                    aria-label="menu"
                    onClick={() => {
                        setEditingTags(true);
                    }}
                >
                    <EditIcon />
                </IconButton>
            </div>
        );
    }
};

export const RecipeInner = ({
    recipe,
    url,
    editorData,
}: {
    recipe: RecipeT,
    url: string,
    editorData: ?{
        actorId: string,
        privateClient: Client<*>,
        client: Client<*>,
        col: Collection<RecipeT>,
    },
}) => {
    const styles = useStyles();
    const status = editorData ? recipe.statuses[editorData.actorId] : null;
    const history = useHistory();
    const [batches, setBatches] = React.useState(1);

    return (
        <div className={styles.container}>
            {recipe.about.image ? (
                <img src={imageUrl(recipe.about.image, url)} className={styles.headerImage} />
            ) : null}
            <div className={styles.title}>
                {recipe.about.title}
                {editorData ? (
                    <IconButton
                        edge="start"
                        style={{ marginRight: 16 }}
                        color="inherit"
                        aria-label="menu"
                        href={`/recipe/${recipe.id}/edit`}
                        onClick={(evt) => {
                            if (evt.button == 0 && !evt.ctrlKey && !evt.metaKey) {
                                history.push(`/recipe/${recipe.id}/edit`);
                                evt.preventDefault();
                                evt.stopPropagation();
                            }
                        }}
                    >
                        <EditIcon />
                    </IconButton>
                ) : null}
            </div>
            <div className={styles.meta}>
                {editorData ? (
                    <ShowTags
                        actorId={editorData.actorId}
                        col={editorData.col}
                        recipe={recipe}
                        client={editorData.client}
                    />
                ) : null}
                {renderSource(recipe.about.source)}
                {renderAuthor(recipe.about.author)}
                <span style={{ marginLeft: 16 }}>
                    Updated {new Date(recipe.updatedDate).toLocaleDateString()}
                </span>
            </div>
            {editorData ? (
                <div className={styles.status}>
                    {statuses.map((name) => (
                        <Button
                            key={name}
                            variant={status === name ? 'contained' : 'outlined'}
                            color="primary"
                            onClick={async () => {
                                if (status === name) {
                                    await editorData.col.clearAttribute(recipe.id, [
                                        'statuses',
                                        editorData.actorId,
                                    ]);
                                } else {
                                    await editorData.col.setAttribute(
                                        recipe.id,
                                        ['statuses', editorData.actorId],
                                        name,
                                    );
                                }
                            }}
                            style={{ marginRight: 8 }}
                        >
                            {name}
                        </Button>
                    ))}
                    <QueueButton id={recipe.id} client={editorData.privateClient} />
                    <MealPlanButton recipeId={recipe.id} privateClient={editorData.privateClient} />
                </div>
            ) : null}
            <div style={{ marginTop: 16 }}>
                Batches:
                {[1, 2, 3].map((num) => (
                    <Button
                        key={num}
                        variant={batches === num ? 'contained' : 'outlined'}
                        style={{ marginLeft: 16 }}
                        onClick={() => {
                            setBatches(num);
                        }}
                    >
                        {num}
                    </Button>
                ))}
                <CustomBatches batches={batches} setBatches={setBatches} />
            </div>
            <div className={styles.text}>{renderQuill(recipe.contents.text, batches)}</div>
            <Comments url={url} recipe={recipe} editorData={editorData} />
        </div>
    );
};

import { fractions, numberToString, parseSingleNumber } from './parse';

const CustomBatches = ({ batches, setBatches }) => {
    const [text, setText] = React.useState(null);
    return (
        <TextField
            value={text == null ? numberToString(batches) : text}
            style={{
                width: 60,
                marginLeft: 16,
            }}
            inputProps={{
                style: {
                    textAlign: 'center',
                },
            }}
            onChange={(evt) => {
                setText(evt.target.value);
                const num = parseSingleNumber(evt.target.value);
                if (num != null) {
                    setBatches(num);
                }
            }}
            onBlur={() => {
                setText(null);
            }}
        />
    );
};

const RecipeView = ({
    client,
    actorId,
    url,
    id: overrideId,
    privateClient,
}: {
    privateClient: Client<*>,
    client: Client<*>,
    actorId: string,
    url: string,
    id?: string,
}) => {
    const match = useRouteMatch();
    const id = overrideId != null ? overrideId : match.params.id;
    const [col, recipe] = useItem<RecipeT, _>(React, client, 'recipes', id);

    useSetTitle(recipe ? `${recipe.about.title} | Foood` : 'Foood');

    if (recipe === false) {
        return <div />; // wait on it
    }
    if (!recipe) {
        return <div>Recipe not found</div>;
    }

    return (
        <RecipeInner
            editorData={{ col, actorId, client, privateClient }}
            url={url}
            recipe={recipe}
        />
    );
};

const Comments = ({ recipe, editorData, url }) => {
    return (
        <div>
            <h3>Comments</h3>
            {editorData ? (
                <NewComment
                    actorId={editorData.actorId}
                    url={url}
                    recipe={recipe}
                    col={editorData.col}
                />
            ) : null}
            <div style={{ height: 36 }} />
            {Object.keys(recipe.comments)
                .sort((a, b) => recipe.comments[b].date - recipe.comments[a].date)
                .map((id) => (
                    <Comment
                        key={id}
                        comment={recipe.comments[id]}
                        url={url}
                        recipe={recipe}
                        editorData={editorData}
                    />
                ))}
        </div>
    );
};

const renderAuthor = (author) => {
    if (!author) {
        return null;
    }
    // Imported author, this is a name
    if (author.startsWith(':')) {
        return <span style={{ marginLeft: 16 }}>{author.slice(1)}</span>;
    }
    // STOPSHIP: figure out how I want to deal with multi-user situations.
    // Do I just assume that users on the same server are allowed to see
    // each other's names?
    // And that there will be few enough users that I can just enumerate them?
    return null;
};

const renderSource = (source) => {
    if (!source) {
        return null;
    }
    const match = source.match(/^https?:\/\/(?<host>[^/]+)/);
    if (match && match.groups) {
        return (
            <a rel="noopener noreferrer" target="_blank" href={source}>
                {match.groups.host}
            </a>
        );
    }
    return <span>{source}</span>;
};

export default RecipeView;
