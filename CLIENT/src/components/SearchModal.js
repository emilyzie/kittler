import React, { useState, useEffect, useCallback, useRef } from 'react';
import defaultProfile from './assets/images/pfp.png';
import { Loading } from '@geist-ui/core';

const SearchModal = ({ onSelect, onClose, inputRef }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [medium, setMedium] = useState('movies');
    const [youtubeType, setYoutubeType] = useState('video');
    const [filter, setFilter] = useState('title');
    const [showFilterOptions, setShowFilterOptions] = useState(false);
    const [showMediumOptions, setShowMediumOptions] = useState(false);
    const [showSortOptions, setShowSortOptions] = useState(false);
    const [selectedDirector, setSelectedDirector] = useState(null);
    const [directorName, setDirectorName] = useState('');
    const [selectedActor, setSelectedActor] = useState(null);
    const [actorName, setActorName] = useState('');
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [channelName, setChannelName] = useState('');
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistName, setPlaylistName] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [sortOption, setSortOption] = useState('relevance');
    const [searchPerformed, setSearchPerformed] = useState(false);
    const fetchController = useRef(null);
    const previousResults = useRef([]);
    const [showModal, setShowModal] = useState(true);

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                func(...args);
            }, delay);
        };
    };

    const fetchResults = async () => {
        if (!query && !selectedDirector && !selectedActor && !selectedChannel && !selectedPlaylist) return;
    
        // Reset results at the beginning of a new search
        setResults([]);
        previousResults.current = [];
    
        if (fetchController.current) {
            fetchController.current.abort();
        }
    
        fetchController.current = new AbortController();
        const { signal } = fetchController.current;
        setIsFetching(true);
    
        let url;
        if (medium === 'movies') {
            if (selectedDirector) {
                url = `https://api.themoviedb.org/3/person/${selectedDirector}/movie_credits?api_key=89d44f8db4046fedba0c0d1a0ab8fc74`;
            } else if (selectedActor) {
                url = `https://api.themoviedb.org/3/person/${selectedActor}/movie_credits?api_key=89d44f8db4046fedba0c0d1a0ab8fc74`;
            } else if (filter === 'title') {
                url = `https://api.themoviedb.org/3/search/movie?api_key=89d44f8db4046fedba0c0d1a0ab8fc74&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
            } else if (filter === 'director' || filter === 'cast') {
                url = `https://api.themoviedb.org/3/search/person?api_key=89d44f8db4046fedba0c0d1a0ab8fc74&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
            }
        } else if (medium === 'TV shows') {
            if (selectedDirector) {
                await fetchTVShowsByCreator(selectedDirector, directorName);
            } else if (selectedActor) {
                await fetchTVShowsByActor(selectedActor, actorName);
            } else if (filter === 'title') {
                url = `https://api.themoviedb.org/3/search/tv?api_key=89d44f8db4046fedba0c0d1a0ab8fc74&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
            } else if (filter === 'creator') {
                await handleFetchCreators();
            } else if (filter === 'cast') {
                await handleFetchCast();
            }
        } else {
            const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
            const maxResults = 10;
            const order = sortOption === 'relevance' ? 'relevance' : 'date';
            if (selectedChannel) {
                url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${selectedChannel}&type=video&maxResults=${maxResults}&order=${order}&key=${API_KEY}`;
            } else if (selectedPlaylist) {
                url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${selectedPlaylist}&maxResults=${maxResults}&key=${API_KEY}`;
            } else {
                url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=${youtubeType}&maxResults=${maxResults}&order=${order}&key=${API_KEY}`;
            }
        }
    
        try {
            if (url) {
                const response = await fetch(url, { signal });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
    
                if (medium === 'movies' || medium === 'TV shows') {
                    let detailedResults = [];
                    if (selectedDirector) {
                        detailedResults = (data.crew || []).filter(movie => movie.job === 'Director' && (!query || movie.title.toLowerCase().includes(query.toLowerCase()))).map(movie => ({
                            ...movie,
                            director: directorName
                        }));
                    } else if (selectedActor) {
                        detailedResults = await Promise.all(data.cast.map(async (movie) => {
                            const detailsUrl = `https://api.themoviedb.org/3/${medium === 'movies' ? 'movie' : 'tv'}/${movie.id}?api_key=89d44f8db4046fedba0c0d1a0ab8fc74&append_to_response=credits`;
                            const detailsResponse = await fetch(detailsUrl);
                            const detailsData = await detailsResponse.json();
                            return {
                                ...movie,
                                actor: actorName,
                                director: detailsData.credits?.crew.find(c => c.job === "Director")?.name || '',
                                created_by: detailsData.created_by && detailsData.created_by.length > 0 ? detailsData.created_by[0].name : '',
                                release_date: detailsData.release_date || detailsData.first_air_date
                            };
                        }));
                    } else if (filter === 'title') {
                        detailedResults = await Promise.all((data.results || []).map(async (item) => {
                            const detailsUrl = `https://api.themoviedb.org/3/${medium === 'movies' ? 'movie' : 'tv'}/${item.id}?api_key=89d44f8db4046fedba0c0d1a0ab8fc74&append_to_response=credits`;
                            const detailsResponse = await fetch(detailsUrl);
                            const detailsData = await detailsResponse.json();
                            return {
                                ...item,
                                director: detailsData.credits?.crew.find(c => c.job === "Director")?.name || '',
                                created_by: detailsData.created_by && detailsData.created_by.length > 0 ? detailsData.created_by[0].name : '',
                                release_date: detailsData.release_date || detailsData.first_air_date
                            };
                        }));
                    } else if (filter === 'director') {
                        detailedResults = (data.results || []).filter(person => person.known_for_department === 'Directing');
                    } else if (filter === 'cast') {
                        detailedResults = (data.results || []).filter(person => person.known_for_department === 'Acting');
                    }
                    // Filter out duplicates by ID
                    detailedResults = detailedResults.filter((item, index, self) => 
                        index === self.findIndex((t) => (
                            t.id === item.id
                        ))
                    );
                    previousResults.current = detailedResults;
                } else {
                    previousResults.current = data.items || [];
                    if (sortOption !== 'relevance') {
                        const sortedResults = [...previousResults.current];
                        sortedResults.sort((a, b) => {
                            if (sortOption === 'date_desc') {
                                return new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt);
                            } else {
                                return new Date(a.snippet.publishedAt) - new Date(b.snippet.publishedAt);
                            }
                        });
                        previousResults.current = sortedResults;
                    }
                }
                setResults(previousResults.current);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to fetch results:', error);
            }
        } finally {
            setIsFetching(false);
            setSearchPerformed(true);
        }
    };    

    const fetchMoviesByDirector = async (directorId, directorName) => {
        const url = `https://api.themoviedb.org/3/person/${directorId}/movie_credits?api_key=89d44f8db4046fedba0c0d1a0ab8fc74`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const directorMovies = data.crew.filter(movie => movie.job === 'Director').map(movie => ({
                ...movie,
                director: directorName
            }));
            previousResults.current = directorMovies;
            setResults(previousResults.current);
            if (sortOption !== 'relevance') {
                handleSortChange(sortOption);
            }
        } catch (error) {
            console.error('Failed to fetch movies by director:', error);
        }
    };

    const fetchMoviesByActor = async (actorId, actorName) => {
        const url = `https://api.themoviedb.org/3/person/${actorId}/movie_credits?api_key=89d44f8db4046fedba0c0d1a0ab8fc74`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const actorMovies = await Promise.all(data.cast.map(async (movie) => {
                const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=89d44f8db4046fedba0c0d1a0ab8fc74&append_to_response=credits`;
                const detailsResponse = await fetch(detailsUrl);
                const detailsData = await detailsResponse.json();
                return {
                    ...movie,
                    actor: actorName,
                    director: detailsData.credits?.crew.find(c => c.job === "Director")?.name || '',
                    release_date: detailsData.release_date || detailsData.first_air_date
                };
            }));
            previousResults.current = actorMovies;
            setResults(previousResults.current);
            if (sortOption !== 'relevance') {
                handleSortChange(sortOption);
            }
        } catch (error) {
            console.error('Failed to fetch movies by actor:', error);
        }
    };

    const fetchTVShowsByActor = async (actorId, actorName) => {
        const url = `https://api.themoviedb.org/3/person/${actorId}/tv_credits?api_key=89d44f8db4046fedba0c0d1a0ab8fc74`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const actorTVShows = await Promise.all(data.cast.map(async (tvShow) => {
                const detailsUrl = `https://api.themoviedb.org/3/tv/${tvShow.id}?api_key=89d44f8db4046fedba0c0d1a0ab8fc74&append_to_response=credits`;
                const detailsResponse = await fetch(detailsUrl);
                const detailsData = await detailsResponse.json();
                return {
                    ...tvShow,
                    actor: actorName,
                    director: detailsData.credits?.crew.find(c => c.job === "Director")?.name || '',
                    created_by: detailsData.created_by && detailsData.created_by.length > 0 ? detailsData.created_by[0].name : '',
                    release_date: detailsData.release_date || detailsData.first_air_date
                };
            }));
            previousResults.current = actorTVShows;
            setResults(previousResults.current);
            if (sortOption !== 'relevance') {
                handleSortChange(sortOption);
            }
        } catch (error) {
            console.error('Failed to fetch TV shows by actor:', error);
        }
    };

    const fetchTVShowsByCreator = async (creatorId, creatorName) => {
        const url = `https://api.themoviedb.org/3/person/${creatorId}/tv_credits?api_key=89d44f8db4046fedba0c0d1a0ab8fc74`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            const creatorTVShows = data.crew.filter(tvShow => tvShow.job === 'Creator').map(tvShow => ({
                ...tvShow,
                creator: creatorName,
                release_date: tvShow.first_air_date // Ensure this field is set correctly
            }));
            previousResults.current = creatorTVShows;
            setResults(previousResults.current);
            if (sortOption !== 'relevance') {
                handleSortChange(sortOption);
            }
        } catch (error) {
            console.error('Failed to fetch TV shows by creator:', error);
        }
    };

    const handleFetchCreators = async () => {
        const url = `https://api.themoviedb.org/3/search/person?api_key=89d44f8db4046fedba0c0d1a0ab8fc74&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const creatorResults = data.results.filter(person => person.known_for_department === 'Directing' || person.known_for_department === 'Writing');
            previousResults.current = creatorResults;
            setResults(creatorResults);
        } catch (error) {
            console.error('Failed to fetch creators:', error);
        }
    };

    const handleFetchCast = async () => {
        const url = `https://api.themoviedb.org/3/search/person?api_key=89d44f8db4046fedba0c0d1a0ab8fc74&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const castResults = data.results.filter(person => person.known_for_department === 'Acting');
            previousResults.current = castResults;
            setResults(castResults);
        } catch (error) {
            console.error('Failed to fetch cast:', error);
        }
    };

    const debouncedFetchResults = useCallback(debounce(fetchResults, 1000), [query, medium, youtubeType, filter, selectedChannel, selectedDirector, selectedActor, selectedPlaylist, sortOption]);

    useEffect(() => {
        const fetchAndSortResults = async () => {
            if (selectedChannel || selectedDirector || selectedActor || selectedPlaylist) {
                await fetchResults();
            }

            if (sortOption === 'relevance') {
                setResults([...previousResults.current]);
            } else {
                const sortedResults = [...previousResults.current];
                sortedResults.sort((a, b) => {
                    if (sortOption === 'date_desc') {
                        return new Date(b.release_date) - new Date(a.release_date);
                    } else {
                        return new Date(a.release_date) - new Date(b.release_date);
                    }
                });
                setResults(sortedResults);
            }
        };

        fetchAndSortResults();
    }, [sortOption, selectedChannel, selectedDirector, selectedActor, selectedPlaylist]);

    useEffect(() => {
        if (inputRef && inputRef.current) {
            inputRef.current.focus();
        }
    }, [inputRef]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setShowModal(false);
                setTimeout(onClose, 300);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const decodeHtml = (html) => {
        var txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (query.length >= 3 || selectedChannel || selectedPlaylist || selectedDirector || selectedActor) {
            fetchResults();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleFormSubmit(e);
        }
    };

    const handleFilterSelect = (filter) => {
        if (medium === 'youtube') {
            setYoutubeType(filter);
        } else {
            setFilter(filter);
        }
        setShowFilterOptions(false);
        inputRef.current.focus();
    };

    const handleSortChange = (option) => {
        setSortOption(option);
        setShowSortOptions(false); // Ensure the dropdown closes

        if (option === 'relevance') {
            setResults([...previousResults.current]);
        } else {
            const sortedResults = [...results];
            sortedResults.sort((a, b) => {
                if (option === 'date_desc') {
                    return new Date(b.release_date) - new Date(a.release_date);
                } else {
                    return new Date(a.release_date) - new Date(b.release_date);
                }
            });
            setResults(sortedResults);
        }
    };

    useEffect(() => {
        if (medium !== 'youtube') {
            if (sortOption === 'relevance') {
                setResults([...previousResults.current]);
            } else {
                const sortedResults = [...results];
                sortedResults.sort((a, b) => {
                    if (sortOption === 'date_desc') {
                        return new Date(b.release_date) - new Date(a.release_date);
                    } else {
                        return new Date(a.release_date) - new Date(b.release_date);
                    }
                });
                setResults(sortedResults);
            }
        } else {
            fetchResults();
        }
    }, [sortOption]);

    useEffect(() => {
        if (medium === 'movies') {
            setFilter('title');
        } else if (medium === 'TV shows') {
            setFilter('title');
        } else if (medium === 'youtube') {
            setYoutubeType('video');
        }
    }, [medium]);

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        setSearchPerformed(false);
        setSortOption('relevance');
    
        if (e.target.value === '' && !selectedActor && !selectedDirector && !selectedChannel && !selectedPlaylist) {
            setResults([]);
            previousResults.current = [];
        } else {
            const filteredResults = previousResults.current.filter(item => {
                if (medium === 'youtube') {
                    return item.snippet.title.toLowerCase().includes(e.target.value.toLowerCase());
                } else {
                    return (item.title || item.name).toLowerCase().includes(e.target.value.toLowerCase());
                }
            });
            setResults(filteredResults);
        }
    };

    const handleDirectorSelect = async (directorId, directorName) => {
        setSelectedDirector(directorId);
        setDirectorName(directorName);
        setQuery('');
        if (medium === 'movies') {
            await fetchMoviesByDirector(directorId, directorName);
        } else {
            await fetchTVShowsByCreator(directorId, directorName);
        }
        setFilter('title');
        inputRef.current.focus();
    };

    const handleActorSelect = async (actorId, actorName) => {
        setSelectedActor(actorId);
        setActorName(actorName);
        setQuery('');
        if (medium === 'movies') {
            await fetchMoviesByActor(actorId, actorName);
        } else {
            await fetchTVShowsByActor(actorId, actorName);
        }
        setFilter('title');
        inputRef.current.focus();
    };

    const handleChannelSelect = async (channelId, channelName) => {
        setSelectedChannel(channelId);
        setChannelName(channelName);
        setYoutubeType('video');
        setQuery('');
        await fetchResults();
        inputRef.current.focus();
    };

    const handlePlaylistSelect = async (playlistId, playlistName) => {
        setSelectedPlaylist(playlistId);
        setPlaylistName(playlistName);
        setYoutubeType('video');
        setQuery('');
        await fetchResults();
        inputRef.current.focus();
    };

    const handleExitDirectorSearch = () => {
        setSelectedDirector(null);
        setDirectorName('');
        setQuery('');
        setResults([]);
        setSearchPerformed(false);
        previousResults.current = [];
    };

    const handleExitActorSearch = () => {
        setSelectedActor(null);
        setActorName('');
        setQuery('');
        setResults([]);
        setSearchPerformed(false);
        previousResults.current = [];
    };

    const handleExitChannelSearch = () => {
        setSelectedChannel(null);
        setChannelName('');
        setQuery('');
        setResults([]);
        setSearchPerformed(false);
        previousResults.current = [];
    };

    const handleExitPlaylistSearch = () => {
        setSelectedPlaylist(null);
        setPlaylistName('');
        setQuery('');
        setResults([]);
        setSearchPerformed(false);
        previousResults.current = [];
    };

    const handleFilterButtonClick = () => {
        if (showMediumOptions) {
            setShowMediumOptions(false);
        }
        setShowFilterOptions(!showFilterOptions);
    };

    const handleMediumButtonClick = () => {
        if (showFilterOptions) {
            setShowFilterOptions(false);
        }
        setShowMediumOptions(!showMediumOptions);
    };

    const handleSortButtonClick = () => {
        setShowSortOptions(!showSortOptions);
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = Math.floor(seconds / 31536000);

        if (interval > 1) {
            return interval + " years ago";
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return interval + " months ago";
        }
        interval = Math.floor(seconds / 604800);
        if (interval > 1) {
            return interval + " weeks ago";
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return interval + " days ago";
        }
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return interval + " hours ago";
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return interval + " minutes ago";
        }
        return Math.floor(seconds) + " seconds ago";
    };

    const shouldShowSortByDropdown = () => {
        return (medium === 'movies' && filter === 'title' || medium === 'TV shows' && filter === 'title' || (medium === 'youtube' && youtubeType === 'video')) && results.length > 0;
    };

    return (
        <div className={`search-modal fixed inset-0 flex items-center justify-center z-50 bg-[#0a0a0a] bg-opacity-75 ${showModal ? 'show' : 'hide'}`} onClick={() => {
            setShowModal(false);
            setResults([]);
            previousResults.current = [];
            setTimeout(onClose, 300);
        }}>
            <div className="bg-[#0a0a0d] rounded-lg shadow-lg w-11/12 max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleFormSubmit} className="flex mb-4 items-center">
                    <div className={`flex flex-grow items-center p-2 bg-[#0a0a0a] border border-[#393939] rounded relative ${showFilterOptions ? 'expanded' : ''}`}>
                        <input
                            type="text"
                            placeholder={
                                selectedChannel
                                    ? `Search ${channelName}'s videos...`
                                    : selectedPlaylist
                                        ? `Search videos in ${playlistName}...`
                                        : selectedDirector
                                            ? `Searching ${medium === 'movies' ? 'movies' : 'TV shows'} by ${directorName}...`
                                            : selectedActor
                                                ? `Searching ${medium === 'movies' ? 'movies' : 'TV shows'} with ${actorName}...`
                                                : ""
                            }
                            value={query}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            className="flex-grow focus:outline-none bg-transparent text-white text-base cursor-thick"
                            ref={inputRef}
                            style={{ caretColor: 'white' }}
                        />
                        {!query && !selectedChannel && !selectedPlaylist && !selectedDirector && !selectedActor && (
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex items-center">
                                <span className="text-[#757575]">Searching </span>
                                <div className="relative">
                                    <button
                                        type="button"
                                        className={`bg-[#3b3b3b] hover:bg-[#292929] px-2 py-1 rounded text-white ml-2 h-full ${showMediumOptions ? 'medium-expanded' : ''}`}
                                        onClick={handleMediumButtonClick}
                                    >
                                        {medium.charAt(0).toUpperCase() + medium.slice(1)}
                                    </button>
                                    {showMediumOptions && (
                                        <div className={`dropdown-menu ${showMediumOptions ? 'slide-out-left' : ''}`}>
                                            {['movies', 'TV shows', 'youtube'].map(option => (
                                                option !== medium && (
                                                    <div
                                                        key={option}
                                                        onClick={() => {
                                                            setMedium(option);
                                                            setSelectedChannel(null);
                                                            setSelectedPlaylist(null);
                                                            setSelectedDirector(null);
                                                            setSelectedActor(null);
                                                            setQuery('');
                                                            setShowMediumOptions(false);
                                                            setShowFilterOptions(false); // Close filter options
                                                            inputRef.current.focus();
                                                        }}
                                                        className={`p-2 cursor-pointer hover:bg-[#292929] hover:text-white ${option === medium ? 'underline text-white' : 'text-gray-400'}`}
                                                    >
                                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[#757575] ml-2"> by </span>
                                <div className="relative">
                                    <button
                                        type="button"
                                        className={`bg-[#3b3b3b] hover:bg-[#292929] px-2 py-1 rounded text-white ml-2 h-full ${showFilterOptions ? 'filter-expanded' : ''}`}
                                        onClick={handleFilterButtonClick}
                                    >
                                        {medium === 'youtube' ? youtubeType.charAt(0).toUpperCase() + youtubeType.slice(1) : filter.charAt(0).toUpperCase() + filter.slice(1)}
                                    </button>
                                    {showFilterOptions && (
                                        <div className={`dropdown-menu ${showFilterOptions ? 'slide-out-right' : ''}`}>
                                            {medium === 'youtube' ? (
                                                <>
                                                    {['video', 'channel', 'playlist'].map(option => (
                                                        option !== youtubeType && (
                                                            <div
                                                                key={option}
                                                                onClick={() => {
                                                                    handleFilterSelect(option);
                                                                    inputRef.current.focus();
                                                                }}
                                                                className={`p-2 cursor-pointer hover:bg-[#292929] hover:text-white ${option === youtubeType ? 'underline text-white' : 'text-gray-400'}`}
                                                            >
                                                                {option.charAt(0).toUpperCase() + option.slice(1)}
                                                            </div>
                                                        )
                                                    ))}
                                                </>
                                            ) : (
                                                <>
                                                    {['title', medium === 'movies' ? 'director' : 'creator', 'cast'].map(option => (
                                                        option !== filter && (
                                                            <div
                                                                key={option}
                                                                onClick={() => {
                                                                    handleFilterSelect(option);
                                                                    inputRef.current.focus();
                                                                }}
                                                                className={`p-2 cursor-pointer hover:bg-[#292929] hover:text-white ${option === filter ? 'underline text-white' : 'text-gray-400'}`}
                                                            >
                                                                {option.charAt(0).toUpperCase() + option.slice(1)}
                                                            </div>
                                                        )
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {shouldShowSortByDropdown() && (
                            <div className="relative ml-2">
                                <button
                                    type="button"
                                    className={`bg-[#3b3b3b] hover:bg-[#292929] mb-0.5 px-2 py-1 rounded text-white text-xs h-full ${showSortOptions ? 'sort-expanded' : ''}`}
                                    onClick={handleSortButtonClick}
                                    style={{ width: '130px' }} // Adjusted width to accommodate the SVG
                                >
                                    {sortOption === 'relevance' ? 'Sort by Relevance' : 'Sort by Newest'}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="inline-block" style={{ width: '10px', height: '10px', marginLeft: '4px', marginRight: '-1px', verticalAlign: 'middle' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>
                                {showSortOptions && (
                                    <div className={`dropdown-menu-sort ${showSortOptions ? 'slide-out-down' : 'slide-out-up'} ${showSortOptions ? 'dropdown-menu-sort-expanded' : ''}`} style={{ width: '130px' }}>
                                        {['relevance', 'date_desc'].map(option => (
                                            option !== sortOption && (
                                                <div
                                                    key={option}
                                                    onClick={() => {
                                                        handleSortChange(option);
                                                    }}
                                                    className={`bg-[#3b3b3b] hover:bg-[#292929] px-2 py-1 text-white text-xs h-full ${option === sortOption ? 'underline text-white' : 'text-gray-400'}`}
                                                >
                                                    {option === 'relevance' ? 'Sort by Relevance' : 'Sort by Newest'}
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedChannel && (
                            <button type="button" onClick={handleExitChannelSearch} className="text-gray-400 hover:text-white ml-2">&times;</button>
                        )}
                        {selectedPlaylist && (
                            <button type="button" onClick={handleExitPlaylistSearch} className="text-gray-400 hover:text-white ml-2">&times;</button>
                        )}
                        {selectedDirector && (
                            <button type="button" onClick={handleExitDirectorSearch} className="text-gray-400 hover:text-white ml-2">&times;</button>
                        )}
                        {selectedActor && (
                            <button type="button" onClick={handleExitActorSearch} className="text-gray-400 hover:text-white ml-2">&times;</button>
                        )}
                        <kbd className="kbd modal-search-bar" size={12}>
                            <span className="K">Enter</span>
                        </kbd>
                    </div>
                </form>
                <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '0', scrollbarColor: 'gray #0a0a0d', scrollbarWidth: 'thin' }}>
                    {isFetching ? (
                        <div className="flex items-center justify-center h-20">
                            <Loading>Loading</Loading>
                        </div>
                    ) : (
                        results.length > 0 ? (
                            results.map((item, index) => (
                                <div
                                    key={`${medium === 'youtube' ? item.id.videoId || item.id.playlistId : item.id}-${index}`}
                                    className="cursor-pointer hover:bg-gray-800 p-2 flex items-center text-white"
                                    onClick={() => {
                                        if (medium === 'youtube' && youtubeType === 'channel') {
                                            handleChannelSelect(item.snippet.channelId, item.snippet.channelTitle);
                                        } else if (medium === 'youtube' && youtubeType === 'playlist') {
                                            handlePlaylistSelect(item.id.playlistId, item.snippet.title);
                                        } else if (medium === 'youtube' && youtubeType === 'video') {
                                            onSelect(item, 'youtube');
                                            onClose();
                                        } else if (filter === 'director' && !selectedDirector) {
                                            handleDirectorSelect(item.id, item.name);
                                        } else if (filter === 'cast' && !selectedActor) {
                                            handleActorSelect(item.id, item.name);
                                        } else if (filter === 'creator' && !selectedDirector) {
                                            handleDirectorSelect(item.id, item.name);
                                        } else {
                                            const movieData = {
                                                ...item,
                                                director: selectedDirector ? directorName : item.director || '',
                                                actor: selectedActor ? actorName : item.actor || '',
                                                created_by: item.created_by,
                                                release_date: item.release_date
                                            };
                                            onSelect(movieData, medium);
                                            onClose();
                                        }
                                    }}
                                >
                                    {medium === 'youtube' ? (
                                        <>
                                            {item.snippet.thumbnails ? (
                                                <img src={item.snippet.thumbnails.default.url} alt="Thumbnail" className="w-24 h-16 mr-4 rounded-md object-contain" />
                                            ) : (
                                                <div className="w-24 h-16 mr-4 rounded-md object-contain bg-gray-700">No Image</div>
                                            )}
                                            <div className="flex flex-col flex-grow">
                                                <div className="font-bold text-left">{decodeHtml(item.snippet.title)}</div>
                                                <div className="text-sm text-gray-400 text-left">{item.snippet.channelTitle} - {timeAgo(item.snippet.publishedAt)}</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {filter === 'director' || filter === 'cast' || filter === 'creator' ? (
                                                <img src={item.profile_path ? `https://image.tmdb.org/t/p/w200${item.profile_path}` : defaultProfile} alt={item.name} className="w-16 h-16 mr-4 rounded-full object-cover" />
                                            ) : (
                                                <img src={item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200?text=No+Image+Available'} alt={item.title || item.name} className="w-24 h-auto mr-4 rounded-md object-contain" />
                                            )}
                                            <div className="flex flex-col flex-grow">
                                                <div className="font-bold text-left">{item.title || item.name} {item.release_date ? `(${item.release_date.substring(0, 4)})` : ''}</div>
                                                {medium === 'TV shows' && !selectedDirector && item.created_by && (
                                                    <div className="text-sm text-gray-400 text-left pl-5">Creator: {item.created_by}</div>
                                                )}
                                                {medium === 'TV shows' && item.creator && (
                                                    <div className="text-sm text-gray-400 text-left pl-5">Creator: {item.creator}</div>
                                                )}
                                                {medium !== 'TV shows' && item.director && (
                                                    <div className="text-sm text-gray-400 text-left pl-5">Director: {item.director}</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        ) : searchPerformed && (
                            <div className="flex items-center justify-center h-20 text-white">
                                No results found
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );      
};

export default SearchModal;
