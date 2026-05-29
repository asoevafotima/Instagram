from sqlalchemy.orm import Session
from medias.models import Media
from medias.schemas import MediaCreate


def get_media(db: Session, media_id: int):
    return db.query(Media).filter(Media.id == media_id).first()


def get_post_medias(db: Session, post_id: int):
    return db.query(Media).filter(
        Media.post_id == post_id
    ).order_by(Media.order).all()


def create_media(db: Session, post_id: int, data: MediaCreate):
    db_media = Media(
        post_id=post_id,
        url=data.url,
        type=data.type,
        order=data.order
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media


def create_medias(db: Session, post_id: int, medias: list[MediaCreate]):
    db_medias = []
    for media in medias:
        db_media = Media(
            post_id=post_id,
            url=media.url,
            type=media.type,
            order=media.order
        )
        db.add(db_media)
        db_medias.append(db_media)
    db.commit()
    return db_medias


def delete_media(db: Session, media_id: int):
    db_media = get_media(db, media_id)
    db.delete(db_media)
    db.commit()


def delete_post_medias(db: Session, post_id: int):
    db.query(Media).filter(Media.post_id == post_id).delete()
    db.commit()
    